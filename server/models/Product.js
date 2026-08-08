import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String, // Base64 data URI or image URL
    default: ''
  },
  category: {
    type: String,
    required: true,
    enum: ['Hostel Items', 'Gadgets', 'Clothing & Fashion', 'Textbooks & Handouts', 'Services', 'Others']
  },
  hostelLocation: {
    type: String,
    required: true
  },
  faculty: {
    type: String,
    default: 'None'
  },
  agreedLocation: {
    type: String,
    default: 'Any Safe Campus Meeting Point'
  },
  status: {
    type: String,
    enum: ['Available', 'Sold'],
    default: 'Available'
  },
  isBoosted: {
    type: Boolean,
    default: false
  },
  boostExpiry: {
    type: Date,
    default: null
  },
  reports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Add MongoDB compound indexes for fast query performance
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ seller: 1, createdAt: -1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ isBoosted: -1, createdAt: -1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
