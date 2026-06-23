import express from 'express';
import { protect } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

const router = express.Router();

// Get Flutterwave Secret Key from environment
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || 'FLWSECK_TEST-sandbox-key';

/**
 * @route   POST /api/payments/initialize
 * @desc    Initialize a payment transaction (escrow, boost, or verification)
 * @access  Private
 */
router.post('/initialize', protect, async (req, res) => {
  const { orderType, productId } = req.body;
  const buyerId = req.user._id;

  try {
    let amount = 0;
    let sellerId = null;

    if (orderType === 'escrow') {
      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required for escrow checkout' });
      }
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      if (product.status === 'Sold') {
        return res.status(400).json({ message: 'Product is already sold' });
      }
      if (product.seller.toString() === buyerId.toString()) {
        return res.status(400).json({ message: 'You cannot buy your own product' });
      }
      amount = product.price;
      sellerId = product.seller;
    } else if (orderType === 'boost') {
      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required for listing boost' });
      }
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      if (product.seller.toString() !== buyerId.toString()) {
        return res.status(403).json({ message: 'Only the seller can boost this listing' });
      }
      amount = 500; // ₦500 flat fee for boosting
    } else if (orderType === 'verification') {
      amount = 1000; // ₦1,000 flat fee for LCU Student Verification badge
    } else {
      return res.status(400).json({ message: 'Invalid order type' });
    }

    const txRef = `lcu-tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const orderData = {
      buyer: buyerId,
      amount,
      orderType,
      txRef,
      paymentStatus: 'Pending',
      escrowStatus: orderType === 'escrow' ? 'None' : 'None'
    };

    if (orderType === 'escrow') {
      orderData.seller = sellerId;
      orderData.product = productId;
    } else if (orderType === 'boost') {
      orderData.product = productId;
    }

    const order = await Order.create(orderData);

    res.status(201).json({
      message: 'Transaction initialized successfully',
      order,
      txRef,
      amount,
      email: req.user.email,
      name: req.user.name,
      phoneNumber: req.user.phoneNumber || '08000000000',
      flwPublicKey: process.env.FLW_PUBLIC_KEY || 'FLWPUBK_TEST-e04f0393f9e20a9e709a367468165cf3-X' // standard test fallback
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ message: 'Server error during payment initialization' });
  }
});

/**
 * @route   POST /api/payments/verify
 * @desc    Verify a Flutterwave transaction and update order/product status
 * @access  Private
 */
router.post('/verify', protect, async (req, res) => {
  const { transactionId, txRef } = req.body;

  if (!transactionId || !txRef) {
    return res.status(400).json({ message: 'Transaction ID and transaction reference are required' });
  }

  try {
    const order = await Order.findOne({ txRef });
    if (!order) {
      return res.status(404).json({ message: 'Order reference not found' });
    }

    if (order.paymentStatus === 'Paid') {
      return res.status(200).json({ message: 'Payment already verified', order });
    }

    // Call Flutterwave verification API
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data.status === 'successful' && data.data.tx_ref === txRef) {
      const amountPaid = data.data.amount;
      if (amountPaid < order.amount) {
        order.paymentStatus = 'Failed';
        await order.save();
        return res.status(400).json({ message: 'Payment amount mismatch. Scam suspected.' });
      }

      order.paymentStatus = 'Paid';
      order.flwTransactionId = transactionId.toString();

      if (order.orderType === 'escrow') {
        order.escrowStatus = 'Held';
        
        // Mark product as sold
        const product = await Product.findById(order.product);
        if (product) {
          product.status = 'Sold';
          await product.save();
        }
      } else if (order.orderType === 'boost') {
        const product = await Product.findById(order.product);
        if (product) {
          product.isBoosted = true;
          // Set expiry 7 days from now
          product.boostExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await product.save();
        }
      } else if (order.orderType === 'verification') {
        const user = await User.findById(order.buyer);
        if (user) {
          user.isVerifiedStudent = true;
          user.isVerificationFeePaid = true;
          await user.save();
        }
      }

      await order.save();
      return res.status(200).json({ message: 'Payment verified and completed successfully', order });
    } else {
      order.paymentStatus = 'Failed';
      await order.save();
      return res.status(400).json({ message: 'Payment verification failed', details: data });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: 'Server error during payment verification' });
  }
});

/**
 * @route   POST /api/payments/confirm-delivery/:orderId
 * @desc    Buyer confirms delivery of items, releasing escrow funds to the seller's wallet
 * @access  Private
 */
router.post('/confirm-delivery/:orderId', protect, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.orderType !== 'escrow') {
      return res.status(400).json({ message: 'Delivery confirmation only applies to escrow orders' });
    }

    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the buyer can confirm delivery' });
    }

    if (order.paymentStatus !== 'Paid') {
      return res.status(400).json({ message: 'Order has not been paid for yet' });
    }

    if (order.escrowStatus !== 'Held') {
      return res.status(400).json({ message: 'Funds are not in escrow hold status' });
    }

    // Release escrow
    order.escrowStatus = 'Released';
    await order.save();

    // Credit seller's wallet
    const seller = await User.findById(order.seller);
    if (seller) {
      seller.walletBalance = (seller.walletBalance || 0) + order.amount;
      await seller.save();
    }

    res.status(200).json({ message: 'Funds released to seller successfully', order });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({ message: 'Server error during delivery confirmation' });
  }
});

/**
 * @route   GET /api/payments/my-orders
 * @desc    Fetch buyer and seller orders for Dashboard display
 * @access  Private
 */
router.get('/my-orders', protect, async (req, res) => {
  try {
    const bought = await Order.find({ buyer: req.user._id })
      .populate('product')
      .populate('seller', 'name email hostel faculty')
      .sort({ createdAt: -1 });

    const sold = await Order.find({ seller: req.user._id })
      .populate('product')
      .populate('buyer', 'name email hostel faculty')
      .sort({ createdAt: -1 });

    res.status(200).json({ bought, sold });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Server error fetching user orders' });
  }
});

export default router;
