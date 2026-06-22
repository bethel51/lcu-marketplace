import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Send message
router.post('/', protect, async (req, res) => {
  try {
    const { receiver, product, content } = req.body;
    
    if (!receiver || !product || !content) {
      return res.status(400).json({ message: 'Receiver, product context and content are required' });
    }
    
    const message = await Message.create({
      sender: req.user._id,
      receiver,
      product,
      content
    });
    
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name isVerifiedStudent')
      .populate('receiver', 'name isVerifiedStudent')
      .populate('product', 'name price image');
      
    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get conversations list (active users we have chatted with)
router.get('/conversations', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    // Find all messages involving the current user
    const messages = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }]
    })
    .sort({ createdAt: -1 })
    .populate('sender', 'name isVerifiedStudent email')
    .populate('receiver', 'name isVerifiedStudent email')
    .populate('product', 'name price image status');
    
    // Group messages by contact + product context to form conversation lists
    const conversationsMap = new Map();
    
    for (const msg of messages) {
      const contact = msg.sender._id.toString() === currentUserId.toString() ? msg.receiver : msg.sender;
      const key = `${contact._id}-${msg.product._id}`;
      
      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          contact,
          product: msg.product,
          lastMessage: msg,
          unread: !msg.read && msg.receiver._id.toString() === currentUserId.toString()
        });
      }
    }
    
    res.json(Array.from(conversationsMap.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get history of messages with a specific contact regarding a specific product
router.get('/:contactId/:productId', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { contactId, productId } = req.params;
    
    const messages = await Message.find({
      product: productId,
      $or: [
        { sender: currentUserId, receiver: contactId },
        { sender: contactId, receiver: currentUserId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name isVerifiedStudent')
    .populate('receiver', 'name isVerifiedStudent');
    
    // Mark received messages as read
    await Message.updateMany(
      { product: productId, sender: contactId, receiver: currentUserId, read: false },
      { $set: { read: true } }
    );
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
