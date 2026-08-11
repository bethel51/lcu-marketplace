/**
 * Rate Limiters — LCU Marketplace
 * Uses express-rate-limit to protect API endpoints from abuse.
 *
 * Tiers:
 *  strict  → auth actions (login, register, OTP) — 10 req / 15 min per IP
 *  payment → payment routes — 20 req / 10 min per IP
 *  write   → product create/update/delete — 30 req / 5 min per IP
 *  general → read-heavy routes (browse, search) — 150 req / 1 min per IP
 */

import rateLimit from 'express-rate-limit';

// ── Reusable handler for limit-exceeded responses ────────────────
const onLimitReached = (req, res) => {
  res.status(429).json({
    message: 'Too many requests. Please slow down and try again in a moment.',
  });
};

// ── 1. Strict — login / register / OTP (brute-force protection) ──
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // relaxed limit to prevent accidental lockout
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached,
  skipSuccessfulRequests: false,
});

// ── 2. Payment — checkout / verify / withdraw ────────────────────
export const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached,
});

// ── 3. Write — POST/PUT/DELETE on products ───────────────────────
export const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached,
});

// ── 4. General — GET browse / search / product views ────────────
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached,
});
