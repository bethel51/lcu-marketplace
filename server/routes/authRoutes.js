import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { sendOTPEmail } from '../utils/email.js';

const router = express.Router();

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'id-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'lcu-marketplace-secret-key-12345', {
    expiresIn: '30d'
  });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, hostel, faculty, requestVerification } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Auto-verify if email contains lcu or if they requested verification (realistic student badge system)
    const isVerifiedStudent = requestVerification || email.toLowerCase().endsWith('.edu.ng') || email.toLowerCase().includes('lcu');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await User.create({
      name,
      email,
      password,
      hostel: hostel || 'None',
      faculty: faculty || 'None',
      isVerifiedStudent,
      isEmailVerified: false,
      otpCode: otp,
      otpExpires
    });

    await sendOTPEmail(email, name, otp);

    res.status(201).json({
      message: 'Registration successful! An OTP code has been sent to your email address.',
      requiresVerification: true,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      if (!user.isEmailVerified) {
        return res.status(400).json({ 
          message: 'Please verify your email address before logging in.', 
          requiresVerification: true,
          email: user.email
        });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        hostel: user.hostel,
        faculty: user.faculty,
        isVerifiedStudent: user.isVerifiedStudent,
        isAdmin: user.isAdmin,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    if (user.otpCode !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }
    
    user.isEmailVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      hostel: user.hostel,
      faculty: user.faculty,
      isVerifiedStudent: user.isVerifiedStudent,
      isAdmin: user.isAdmin,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = otp;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    
    await sendOTPEmail(user.email, user.name, otp);
    
    res.json({ message: 'A new OTP code has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('wishlist');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.hostel = req.body.hostel || user.hostel;
      user.faculty = req.body.faculty || user.faculty;
      await user.save();
      
      const populated = await User.findById(user._id).select('-password').populate('wishlist');
      res.json(populated);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Request Verification Badge
router.post('/verify-student', protect, upload.single('idCard'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.isVerifiedStudent = true;
      await user.save();
      res.json({ message: 'Verification badge granted!', isVerifiedStudent: true });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rate Seller
router.post('/rate/:id', protect, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const targetUserId = req.params.id;
    
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot rate yourself' });
    }
    
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user already reviewed
    const alreadyReviewed = targetUser.ratings.find(
      (r) => r.reviewer.toString() === req.user._id.toString()
    );
    
    if (alreadyReviewed) {
      alreadyReviewed.rating = Number(rating);
      alreadyReviewed.review = review;
    } else {
      targetUser.ratings.push({
        reviewer: req.user._id,
        rating: Number(rating),
        review
      });
    }
    
    await targetUser.save();
    res.json({ message: 'Rating added successfully!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Seller Details
router.get('/seller/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('ratings.reviewer', 'name isVerifiedStudent');
      
    if (!user) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    const products = await Product.find({ seller: req.params.id });
    
    res.json({
      seller: user,
      products
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get all users
router.get('/admin/users', protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access denied' });
    }
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Toggle user student verification badge
router.post('/admin/verify-student/:id', protect, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access denied' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isVerifiedStudent = !user.isVerifiedStudent;
    await user.save();
    
    res.json({ message: `Verification status updated successfully.`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
