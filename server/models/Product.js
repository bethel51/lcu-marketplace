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
    enum: ['Hostel Items', 'Gadgets', 'Textbooks & Handouts', 'Services', 'Others']
  },
  hostelLocation: {
    type: String,
    required: true
  },
  faculty: {
    type: String,
    default: 'None'
  },
  status: {
    type: String,
    enum: ['Available', 'Sold'],
    default: 'Available'
  },
  reports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);
export default Product;
