import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/* ─── GET /api/notifications — fetch current user's inbox ─── */
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(notifications);
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ─── PUT /api/notifications/read — mark all as read ─────── */
router.put('/read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ─── DELETE /api/notifications — clear all notifications ── */
router.delete('/', protect, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ─── Utility: createNotification (used internally) ──────── */
export async function createNotification(recipientId, message, type = 'info') {
  try {
    await Notification.create({ recipient: recipientId, message, type });
  } catch (err) {
    console.error('createNotification error:', err);
  }
}

export default router;
