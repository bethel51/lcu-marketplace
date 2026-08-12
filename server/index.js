import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Route imports
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';

// Rate limiters
import { strictLimiter, paymentLimiter, writeLimiter, generalLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Copy the new logo file sent by the user to public, assets, and app icon folders
const logoSrc = "C:/Users/HP/.gemini/antigravity-ide/brain/6d80e7d4-ec6c-46b1-a8de-77fb4beb9bf2/media__1786390744949.jpg";
if (fs.existsSync(logoSrc)) {
  try {
    const clientPublicLogo = path.join(__dirname, '../client/public/logo.png');
    const clientAssetsLogo = path.join(__dirname, '../client/assets/logo.png');
    
    const logoBuffer = fs.readFileSync(logoSrc);
    fs.writeFileSync(clientPublicLogo, logoBuffer);
    fs.writeFileSync(clientAssetsLogo, logoBuffer);
    
    // Overwrite PWA webp icons with the new logo
    const sizes = [48, 72, 96, 128, 192, 256, 512];
    for (const s of sizes) {
      const destPath = path.join(__dirname, `../client/public/icons/icon-${s}.webp`);
      try {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, logoBuffer);
      } catch(_) {}
    }
    console.log("LCU Logo Updater (Server): FORCED update of all client logos and PWA icons.");
  } catch (e) {
    console.error("LCU Logo Updater (Server) Error:", e);
  }
}

// Connect to MongoDB
connectDB();

const app = express();
app.set('trust proxy', 1); // trust first proxy (e.g. Render, Heroku)

// ── Static files ─────────────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── CORS ─────────────────────────────────────────────────────────
const clientUrl = process.env.CLIENT_URL || '*';
app.use(cors({
  origin: clientUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body parsers ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Lightweight request logger (dev only) ─────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ── API Routes with targeted rate limiting ────────────────────────
// Auth: strict limit on login/register/OTP to block brute force
app.use('/api/auth', strictLimiter, authRoutes);

// Products: general reads are generous; writes get a tighter cap
app.use('/api/products', generalLimiter, productRoutes);

// Payments: tighter limits to prevent payment abuse
app.use('/api/payments', paymentLimiter, paymentRoutes);

// Notifications: general limit — quick reads
app.use('/api/notifications', generalLimiter, notificationRoutes);

// Integration with LCU Errands
app.use('/api/integration', generalLimiter, integrationRoutes);

// ── Global 404 handler ───────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  next();
});

// ── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// ── Serve frontend in production ─────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Not Found' });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'LCU Marketplace API', status: 'Running', version: '1.0.0' });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
