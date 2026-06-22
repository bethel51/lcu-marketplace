import express from 'express';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get all products (with search & filters)
router.get('/', async (req, res) => {
  try {
    const { search, category, hostel, faculty, status, minPrice, maxPrice } = req.query;
    
    let query = {};
    
    // Default to only available items unless specified
    if (status) {
      query.status = status;
    } else {
      query.status = 'Available';
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (hostel && hostel !== 'All' && hostel !== 'None') {
      query.hostelLocation = hostel;
    }
    
    if (faculty && faculty !== 'All' && faculty !== 'None') {
      query.faculty = faculty;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(query)
      .populate('seller', 'name isVerifiedStudent email')
      .sort({ createdAt: -1 });
      
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'seller',
        select: 'name email hostel faculty isVerifiedStudent ratings'
      });
      
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create product
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { name, price, description, category, hostelLocation, faculty } = req.body;
    
    let imagePath = '';
    if (req.file) {
      const host = req.get('host');
      imagePath = `${req.protocol}://${host}/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      imagePath = req.body.image;
    }
    
    const product = await Product.create({
      seller: req.user._id,
      name,
      price: Number(price),
      description,
      image: imagePath,
      category,
      hostelLocation,
      faculty: faculty || 'None'
    });
    
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Edit product
router.put('/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const { name, price, description, category, hostelLocation, faculty, status } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    let imagePath = product.image;
    if (req.file) {
      const host = req.get('host');
      imagePath = `${req.protocol}://${host}/uploads/${req.file.filename}`;
    } else if (req.body.image !== undefined) {
      imagePath = req.body.image;
    }
    
    product.name = name || product.name;
    product.price = price !== undefined ? Number(price) : product.price;
    product.description = description || product.description;
    product.image = imagePath;
    product.category = category || product.category;
    product.hostelLocation = hostelLocation || product.hostelLocation;
    product.faculty = faculty || product.faculty;
    product.status = status || product.status;
    
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete product
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if seller OR if admin
    if (product.seller.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    await product.deleteOne();
    res.json({ message: 'Listing removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Report product (Scam reporting feature)
router.post('/:id/report', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if already reported by this user
    if (product.reports.includes(req.user._id)) {
      return res.status(400).json({ message: 'You have already reported this listing' });
    }
    
    product.reports.push(req.user._id);
    await product.save();
    res.json({ message: 'Listing reported successfully. Admin review is pending.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle Wishlist
router.post('/:id/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.id;
    
    const index = user.wishlist.indexOf(productId);
    let isWishlisted = false;
    
    if (index > -1) {
      user.wishlist.splice(index, 1);
    } else {
      user.wishlist.push(productId);
      isWishlisted = true;
    }
    
    await user.save();
    res.json({ isWishlisted, wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get all reported products
router.get('/admin/reported', protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access denied' });
    }
    
    // Find products where reports array has elements
    const products = await Product.find({ reports: { $exists: true, $not: { $size: 0 } } })
      .populate('seller', 'name email isVerifiedStudent');
      
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Dismiss all reports for a product
router.post('/:id/dismiss-reports', protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access denied' });
    }
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    product.reports = [];
    await product.save();
    
    res.json({ message: 'Product reports dismissed successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
