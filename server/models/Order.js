import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  orderType: {
    type: String,
    enum: ['escrow', 'boost', 'verification', 'pro_upgrade'],
    default: 'escrow'
  },
  amount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  escrowStatus: {
    type: String,
    enum: ['None', 'Held', 'Released', 'Refunded'],
    default: 'None'
  },
  txRef: {
    type: String,
    required: true,
    unique: true
  },
  flwTransactionId: {
    type: String,
    default: ''
  },
  pickupDate: {
    type: String,
    default: ''
  },
  pickupTime: {
    type: String,
    default: ''
  },
  meetingPoint: {
    type: String,
    default: ''
  },
  buyerNote: {
    type: String,
    default: ''
  },
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'errands'],
    default: 'pickup'
  },
  errandId: {
    type: String,
    default: ''
  },
  deliveryStatus: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
