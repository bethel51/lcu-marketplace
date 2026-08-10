import express from 'express';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import multer from 'multer';
import path from 'path';
import { createNotification } from './notificationRoutes.js';

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

// Helper to handle multer upload errors — supports multiple images
const handleUpload = (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File is too large. Max size allowed is 5MB.' });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// ── Get all products (with search & filters) ───────────────────
router.get('/', async (req, res) => {
  try {
    const { search, category, hostel, faculty, status, minPrice, maxPrice, seller } = req.query;
    
    let query = {};

    // If fetching by seller (for dashboard), skip the default status filter
    if (seller) {
      query.seller = seller;
      if (status && status !== 'All') query.status = status;
    } else {
      if (status && status !== 'All') {
        query.status = status;
      } else if (!status) {
        query.status = 'Available';
        // Also exclude reserved/sold via productStatus
        query.productStatus = { $in: ['Available', 'Reserved'] };
      }
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
      .populate('seller', 'name isVerifiedStudent email isPro')
      .sort({ isBoosted: -1, isFeatured: -1, createdAt: -1 })
      .lean();

    // Short browser cache — 10s for general listing; 0 for seller-specific views
    if (!seller) {
      res.set('Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
    }
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get featured products (PRO feature) ───────────────────────
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({
      isFeatured: true,
      status: 'Available',
      productStatus: { $in: ['Available', 'Reserved'] }
    })
      .populate('seller', 'name isVerifiedStudent email isPro')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get seller storefront products ─────────────────────────────
router.get('/storefront/:userId', async (req, res) => {
  try {
    const products = await Product.find({
      seller: req.params.userId,
      status: 'Available',
      productStatus: { $ne: 'Sold' }
    })
      .populate('seller', 'name isVerifiedStudent email isPro storefrontBio ratings')
      .sort({ isBoosted: -1, isFeatured: -1, createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get product count (fast stats) ────────────────────────────
router.get('/count', async (req, res) => {
  try {
    const count = await Product.countDocuments({ status: 'Available' });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Admin: Get all reported products ──────────────────────────
router.get('/admin/reported', protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access denied' });
    }
    const products = await Product.find({ reports: { $exists: true, $not: { $size: 0 } } })
      .populate('seller', 'name email isVerifiedStudent');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PRO Analytics: Get seller analytics summary ────────────────
router.get('/analytics/seller', protect, async (req, res) => {
  try {
    const sellerId = req.user._id;
    const products = await Product.find({ seller: sellerId });
    
    const totalViews    = products.reduce((s, p) => s + (p.views || 0), 0);
    const totalSaves    = products.reduce((s, p) => s + (p.saves || 0), 0);
    const totalEnquiries= products.reduce((s, p) => s + (p.enquiries || 0), 0);
    const activeCount   = products.filter(p => p.status === 'Available').length;

    const mostViewed  = products.sort((a, b) => b.views - a.views)[0] || null;
    const mostSaved   = [...products].sort((a, b) => b.saves - a.saves)[0] || null;

    res.json({
      totalViews,
      totalSaves,
      totalEnquiries,
      activeCount,
      mostViewed: mostViewed ? { name: mostViewed.name, views: mostViewed.views, _id: mostViewed._id } : null,
      mostSaved:  mostSaved  ? { name: mostSaved.name,  saves: mostSaved.saves,  _id: mostSaved._id }  : null,
      products: products.map(p => ({
        _id: p._id,
        name: p.name,
        views: p.views || 0,
        saves: p.saves || 0,
        enquiries: p.enquiries || 0,
        status: p.status,
        productStatus: p.productStatus,
        isBoosted: p.isBoosted,
        isFeatured: p.isFeatured,
        image: p.images?.[0] || p.image || '',
        price: p.price,
        originalPrice: p.originalPrice
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Get single product ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'seller',
        select: 'name email hostel faculty isVerifiedStudent ratings isPro storefrontBio'
      })
      .lean();
      
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Track product view (analytics) ────────────────────────────
router.post('/:id/view', async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Track enquiry (analytics) ──────────────────────────────────
router.post('/:id/enquiry', protect, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { enquiries: 1 } },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    // Notify seller of enquiry
    if (product.seller.toString() !== req.user._id.toString()) {
      await createNotification(
        product.seller,
        `💬 Someone enquired about your listing "${product.name}"!`,
        'info'
      );
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Create product ─────────────────────────────────────────────
router.post('/', protect, writeLimiter, handleUpload, async (req, res) => {
  try {
    const {
      name, price, originalPrice, description, category,
      hostelLocation, faculty, agreedLocation, condition,
      productStatus, isFeatured
    } = req.body;

    // Listing limit enforcement — counts ACTIVE (non-sold) listings only
    const seller = await User.findById(req.user._id);
    const activeListings = await Product.countDocuments({
      seller: req.user._id,
      status: { $ne: 'Sold' }   // Available + Reserved count toward limit
    });
    const limit = seller.isPro ? 20 : 10;
    if (activeListings >= limit) {
      return res.status(400).json({
        message: seller.isPro
          ? `PRO sellers can have up to ${limit} active listings. Mark some as Sold to free up slots.`
          : `Standard sellers can have up to ${limit} active listings. Upgrade to PRO for up to 20 listings!`
      });
    }

    // Process uploaded images
    const host = req.get('host');
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // Enforce image limit: 8 for PRO, 4 for standard
      const maxPhotos = seller.isPro ? 8 : 4;
      const filesToUse = req.files.slice(0, maxPhotos);
      imageUrls = filesToUse.map(f => `${req.protocol}://${host}/uploads/${f.filename}`);
    } else if (req.body.images) {
      // Base64/URL fallback
      const imgs = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
      const maxPhotos = seller.isPro ? 8 : 4;
      imageUrls = imgs.slice(0, maxPhotos);
    } else if (req.body.image) {
      imageUrls = [req.body.image];
    }

    // Only PRO sellers can feature or use extended productStatus
    const canUsePro = seller.isPro;

    const product = await Product.create({
      seller: req.user._id,
      name,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      description,
      image: imageUrls[0] || '',
      images: imageUrls,
      category,
      hostelLocation,
      faculty: faculty || 'None',
      agreedLocation: agreedLocation || 'Any Safe Campus Meeting Point',
      condition: condition || 'Good',
      productStatus: canUsePro ? (productStatus || 'Available') : 'Available',
      isFeatured: canUsePro ? (isFeatured === 'true' || isFeatured === true) : false,
    });
    
    res.status(201).json(product);

    await createNotification(
      req.user._id,
      `🎉 Your listing "${name}" is now live on the marketplace!`,
      'success'
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Edit product ───────────────────────────────────────────────
router.put('/:id', protect, handleUpload, async (req, res) => {
  try {
    const {
      name, price, originalPrice, description, category,
      hostelLocation, faculty, status, agreedLocation,
      condition, productStatus, isFeatured
    } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const seller = await User.findById(req.user._id);
    const canUsePro = seller.isPro;

    // Process uploaded images
    const host = req.get('host');
    let imageUrls = product.images || [];
    if (req.files && req.files.length > 0) {
      const maxPhotos = seller.isPro ? 8 : 4;
      const filesToUse = req.files.slice(0, maxPhotos);
      imageUrls = filesToUse.map(f => `${req.protocol}://${host}/uploads/${f.filename}`);
    } else if (req.body.images) {
      const imgs = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
      const maxPhotos = seller.isPro ? 8 : 4;
      imageUrls = imgs.slice(0, maxPhotos);
    }
    
    product.name        = name        || product.name;
    product.price       = price !== undefined ? Number(price) : product.price;
    product.originalPrice = originalPrice !== undefined
      ? (originalPrice ? Number(originalPrice) : null)
      : product.originalPrice;
    product.description = description || product.description;
    product.images      = imageUrls;
    product.image       = imageUrls[0] || product.image;
    product.category    = category    || product.category;
    product.hostelLocation = hostelLocation || product.hostelLocation;
    product.faculty     = faculty     || product.faculty;
    product.agreedLocation = agreedLocation || product.agreedLocation;
    product.condition   = condition   || product.condition;

    // productStatus drives the main status too
    if (productStatus && canUsePro) {
      product.productStatus = productStatus;
      // Sync main status
      product.status = productStatus === 'Sold' ? 'Sold' : 'Available';
    } else if (status) {
      product.status = status;
      product.productStatus = status;
    }

    if (canUsePro && isFeatured !== undefined) {
      product.isFeatured = isFeatured === 'true' || isFeatured === true;
    }
    
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Delete product ─────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (product.seller.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    await User.updateMany(
      { wishlist: product._id },
      { $pull: { wishlist: product._id } }
    );

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PRO: Boost a product (24hr boost) ─────────────────────────
router.post('/:id/boost', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const seller = await User.findById(req.user._id);
    if (!seller.isPro) {
      return res.status(403).json({ message: 'Product Boost is a PRO Seller feature.' });
    }

    const { hours = 24 } = req.body;
    product.isBoosted   = true;
    product.boostExpiry = new Date(Date.now() + hours * 60 * 60 * 1000);
    await product.save();

    res.json({ message: `"${product.name}" boosted for ${hours} hours! 🚀`, product });

    await createNotification(
      req.user._id,
      `🚀 Your listing "${product.name}" is now boosted for ${hours} hours!`,
      'success'
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── PRO: Toggle featured status ────────────────────────────────
router.post('/:id/feature', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const seller = await User.findById(req.user._id);
    if (!seller.isPro) {
      return res.status(403).json({ message: 'Featured Products is a PRO Seller feature.' });
    }

    product.isFeatured = !product.isFeatured;
    await product.save();

    res.json({
      message: product.isFeatured
        ? `"${product.name}" is now featured! ⭐`
        : `"${product.name}" removed from featured.`,
      isFeatured: product.isFeatured
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Report product ─────────────────────────────────────────────
router.post('/:id/report', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
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

// ── Toggle Wishlist (also increments/decrements saves counter) ─
router.post('/:id/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.id;
    
    const index = user.wishlist.indexOf(productId);
    let isWishlisted = false;
    
    if (index > -1) {
      user.wishlist.splice(index, 1);
      // Decrement saves counter
      await Product.findByIdAndUpdate(productId, { $inc: { saves: -1 } });
    } else {
      user.wishlist.push(productId);
      isWishlisted = true;
      // Increment saves counter
      await Product.findByIdAndUpdate(productId, { $inc: { saves: 1 } });
    }
    
    await user.save();
    res.json({ isWishlisted, wishlist: user.wishlist });

    if (isWishlisted) {
      const product = await Product.findById(productId).select('name seller');
      if (product && product.seller.toString() !== req.user._id.toString()) {
        await createNotification(
          product.seller,
          `❤️ Someone saved your listing "${product.name}" to their wishlist!`,
          'info'
        );
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Admin: Dismiss all reports for a product ───────────────────
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
