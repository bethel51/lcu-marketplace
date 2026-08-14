import { API_URL } from '../config';

/**
 * Resolves a product image URL so it always points to a working, reachable URL
 * across all devices (Desktop, Mobile, Android, PWA, etc.).
 */
export function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';

  // Return blob or data URLs directly (used for local uploads/previews)
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // If the URL references server uploads (/uploads/...)
  if (url.includes('/uploads/')) {
    const uploadPath = url.substring(url.indexOf('/uploads/'));
    const baseUrl = (API_URL && API_URL.length > 0)
      ? API_URL
      : (typeof window !== 'undefined' ? `http://${window.location.hostname}:5000` : '');
    return `${baseUrl}${uploadPath}`;
  }

  // If it's an external absolute URL (e.g. Cloudinary, Unsplash, HTTPS images)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // If external URL points to localhost on a non-localhost client (e.g. Android phone), rewrite hostname
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (url.includes('localhost:5000') || url.includes('127.0.0.1:5000')) {
        const uploadPath = url.substring(url.indexOf(':5000') + 5);
        const baseUrl = (API_URL && API_URL.length > 0) ? API_URL : `http://${window.location.hostname}:5000`;
        return `${baseUrl}${uploadPath}`;
      }
    }
    return url;
  }

  // Fallback for relative paths starting with '/'
  if (url.startsWith('/')) {
    const baseUrl = (API_URL && API_URL.length > 0)
      ? API_URL
      : (typeof window !== 'undefined' ? window.location.origin : '');
    return `${baseUrl}${url}`;
  }

  return url;
}

/**
 * Returns the resolved display image URL for a product object.
 * Checks `images[0]` first, then `image`.
 */
export function getProductImage(product) {
  if (!product) return '';
  const raw = (product.images && product.images.length > 0)
    ? product.images[0]
    : (product.image || '');
  return resolveImageUrl(raw);
}

