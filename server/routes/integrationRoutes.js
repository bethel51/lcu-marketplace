import express from 'express';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/auth.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { createNotification } from './notificationRoutes.js';

const router = express.Router();

const INTEGRATION_SECRET    = process.env.JWT_SECRET;
const LCU_ERRANDS_URL       = process.env.LCU_ERRANDS_URL       || 'http://localhost:3001';
const ERRANDS_WEBHOOK_SECRET = process.env.ERRANDS_WEBHOOK_SECRET || 'lcu-errands-webhook-secret-2025';

// ─── helpers ─────────────────────────────────────────────────
function verifyWebhookSecret(req) {
  const header = req.headers['x-errands-secret'] || '';
  return header === ERRANDS_WEBHOOK_SECRET;
}

/**
 * @route   POST /api/integration/errands/initialize-delivery/:orderId
 * @desc    Verify eligibility and build a signed redirect URL to LCU Errands
 * @access  Private (Seller only)
 *
 * Requirement 2: Checks if seller already has an LCU Errands account (errandsUserId).
 *   - Has account  → redirects to /marketplace-delivery (straight to the delivery request)
 *   - No account   → redirects to /register-for-marketplace (registration/login flow)
 * Requirement 3: Includes productImage in the signed payload.
 * Requirement 5: Server-side idempotency — rejects if errandId already set.
 */
router.post('/errands/initialize-delivery/:orderId', protect, async (req, res) => {
  const { orderId } = req.params;
  const userId      = req.user._id;

  try {
    const order = await Order.findById(orderId)
      .populate('buyer', 'name phoneNumber hostel')
      .populate('product', 'name price images image');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // ── Security checks (Requirement 5 & 13) ─────────────────
    if (order.seller.toString() !== userId.toString())
      return res.status(403).json({ message: 'Unauthorized: only the seller of this order can assign a messenger' });

    if (order.paymentStatus !== 'Paid')
      return res.status(400).json({ message: 'Order has not been paid' });

    if (order.orderType !== 'escrow')
      return res.status(400).json({ message: 'Only escrow product orders are eligible for delivery' });

    if (order.escrowStatus === 'Released')
      return res.status(400).json({ message: 'Order is already completed' });

    // Idempotency — prevent duplicate errand requests (Requirement 5)
    if (order.errandId && !['awaiting_messenger', 'cancelled'].includes(order.deliveryStatus)) {
      return res.status(400).json({
        message: 'A messenger request already exists for this order',
        errandId:       order.errandId,
        deliveryStatus: order.deliveryStatus
      });
    }

    // ── Build verified payload (Requirement 3) ────────────────
    const seller  = await User.findById(order.seller);
    const buyer   = order.buyer;
    const product = order.product;

    if (!seller || !buyer || !product)
      return res.status(400).json({ message: 'Incomplete order details — missing seller, buyer or product' });

    // Product image (first available)
    const productImage = (product.images && product.images[0]) || product.image || '';

    const payload = {
      marketplaceOrderId: order._id.toString(),
      sellerId:           seller._id.toString(),
      sellerName:         seller.name,
      sellerErrandsId:    seller.errandsUserId || null,   // tells Errands if seller is already linked
      buyerId:            buyer._id.toString(),
      buyerName:          buyer.name,
      buyerPhone:         buyer.phoneNumber || '',
      productId:          product._id.toString(),
      productName:        product.name,
      productImage,
      quantity:           1,                               // Marketplace orders are single-quantity
      productPrice:       order.amount,
      pickupLocation:     seller.hostel || 'Off-Campus',
      deliveryLocation:   order.meetingPoint || buyer.hostel || 'Off-Campus',
      buyerNote:          order.buyerNote || '',
      paymentStatus:      order.paymentStatus,
      // Callback URLs so LCU Errands knows where to report back
      callbackUrl:        `${process.env.SERVER_URL || 'http://localhost:5000'}/api/integration/errands/webhook`,
    };

    // Sign with 30-minute expiry (Requirement 3 & 13)
    const signedToken = jwt.sign(payload, INTEGRATION_SECRET, { expiresIn: '30m' });

    // Mark order as pending delivery (idempotent set)
    order.deliveryMethod  = 'errands';
    order.deliveryStatus  = 'awaiting_messenger';
    await order.save();

    // ── Requirement 2: different redirect based on Errands account status ─
    const hasErrandsAccount = !!seller.errandsUserId;
    const errrandsPath      = hasErrandsAccount ? '/marketplace-delivery' : '/register-for-marketplace';
    const redirectUrl       = `${LCU_ERRANDS_URL}${errrandsPath}?token=${signedToken}`;

    return res.json({
      success:  true,
      redirectUrl,
      hasErrandsAccount,
    });

  } catch (err) {
    console.error('[initialize-delivery] error:', err);
    return res.status(500).json({ message: 'Server error initialising delivery integration' });
  }
});

/**
 * @route   POST /api/integration/errands/link-account
 * @desc    Called by LCU Errands after a seller registers/logs in there.
 *          Saves the seller's Errands user ID against their Marketplace profile.
 * @access  Secured via shared webhook secret header (x-errands-secret)
 *
 * Requirement 6: Marketplace recognises the connection after seller returns from Errands.
 */
router.post('/errands/link-account', async (req, res) => {
  if (!verifyWebhookSecret(req))
    return res.status(401).json({ message: 'Invalid webhook secret' });

  const { marketplaceSellerId, errandsUserId } = req.body;
  if (!marketplaceSellerId || !errandsUserId)
    return res.status(400).json({ message: 'marketplaceSellerId and errandsUserId are required' });

  try {
    const seller = await User.findById(marketplaceSellerId);
    if (!seller) return res.status(404).json({ message: 'Seller not found' });

    seller.errandsUserId = errandsUserId;
    await seller.save();

    return res.json({ success: true, message: 'LCU Errands account linked to Marketplace seller' });
  } catch (err) {
    console.error('[link-account] error:', err);
    return res.status(500).json({ message: 'Server error linking account' });
  }
});

/**
 * @route   POST /api/integration/errands/webhook
 * @desc    Receives delivery status updates from LCU Errands.
 *          Requires x-errands-secret header for authentication.
 * @access  Secured via shared webhook secret
 *
 * Requirements 6, 7, 9: Saves errandId, syncs deliveryStatus, notifies buyer.
 */
router.post('/errands/webhook', async (req, res) => {
  if (!verifyWebhookSecret(req))
    return res.status(401).json({ message: 'Invalid webhook secret' });

  const { marketplaceOrderId, errandId, status } = req.body;

  if (!marketplaceOrderId || !errandId || !status)
    return res.status(400).json({ message: 'marketplaceOrderId, errandId and status are required' });

  // Validate allowed statuses (Requirement 7)
  const ALLOWED_STATUSES = [
    'awaiting_messenger', 'messenger_requested', 'messenger_assigned',
    'item_picked_up', 'out_for_delivery',
    'delivered', 'buyer_confirmation_required', 'completed',
    'cancelled',
  ];
  if (!ALLOWED_STATUSES.includes(status))
    return res.status(400).json({ message: `Unknown delivery status: ${status}` });

  try {
    const order = await Order.findById(marketplaceOrderId);
    if (!order) return res.status(404).json({ message: 'Marketplace order not found' });

    // Save the Errands reference (Requirement 6)
    order.errandId       = errandId;
    order.deliveryMethod = 'errands';
    order.deliveryStatus = status;
    await order.save();

    // ── Buyer notifications (Requirement 9) ──────────────────
    const ref = order.txRef;
    const notificationMap = {
      messenger_assigned:          `🚚 Your order #${ref} has been assigned to a messenger.`,
      item_picked_up:              `📦 Your order #${ref} has been picked up from the seller.`,
      out_for_delivery:            `🚴 Your order #${ref} is on its way to you!`,
      delivered:                   `📍 Your order #${ref} has been delivered. Please confirm receipt.`,
      buyer_confirmation_required: `📍 Your order #${ref} has been delivered. Please confirm receipt.`,
      completed:                   `✅ Your order #${ref} has been successfully completed. Thank you!`,
    };

    const msg = notificationMap[status];
    if (msg) await createNotification(order.buyer, msg, 'info');

    return res.json({ success: true, message: 'Delivery status synchronised' });

  } catch (err) {
    console.error('[errands-webhook] error:', err);
    return res.status(500).json({ message: 'Server error processing webhook' });
  }
});

/**
 * @route   GET /api/integration/errands/status/:orderId
 * @desc    Lets the frontend poll current delivery status for an order
 * @access  Private
 */
router.get('/errands/status/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select(
      'deliveryMethod deliveryStatus errandId buyer seller'
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const uid = req.user._id.toString();
    if (order.buyer.toString() !== uid && order.seller.toString() !== uid)
      return res.status(403).json({ message: 'Unauthorized' });

    return res.json({
      deliveryMethod: order.deliveryMethod,
      deliveryStatus: order.deliveryStatus,
      errandId:       order.errandId,
    });
  } catch (err) {
    console.error('[errands-status] error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
