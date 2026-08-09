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
  // PRO: Original price before discount (optional)
  originalPrice: {
    type: Number,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  // Legacy single image (kept for backwards compatibility)
  image: {
    type: String,
    default: ''
  },
  // PRO: Multiple images array (up to 8 for PRO, 4 for standard)
  images: {
    type: [String],
    default: []
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
  // PRO: condition of the item
  condition: {
    type: String,
    enum: ['New', 'Like New', 'Good', 'Fair'],
    default: 'Good'
  },
  status: {
    type: String,
    enum: ['Available', 'Sold'],
    default: 'Available'
  },
  // PRO: Extended product status (Available/Reserved/Sold)
  productStatus: {
    type: String,
    enum: ['Available', 'Reserved', 'Sold'],
    default: 'Available'
  },
  // PRO: Featured product flag (appears in Featured section)
  isFeatured: {
    type: Boolean,
    default: false
  },
  isBoosted: {
    type: Boolean,
    default: false
  },
  boostExpiry: {
    type: Date,
    default: null
  },
  // PRO Analytics
  views: {
    type: Number,
    default: 0
  },
  saves: {
    type: Number,
    default: 0
  },
  enquiries: {
    type: Number,
    default: 0
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
