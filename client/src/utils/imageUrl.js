import { API_URL, getBaseApiUrl } from '../config';

/**
 * Resolves a product image URL so it always points to a working, reachable URL
 * across all environments and devices (Desktop, Mobile, Android, Production, Dev).
 */
export function resolveImageUrl(url) {
  if (!url) return '';

  // If url is an object (e.g. { preview: '...', url: '...' })
  if (typeof url === 'object' && url !== null) {
    url = url.preview || url.url || url.src || url.path || '';
  }

  // If url is a JSON array string e.g. '["/uploads/img.jpg"]'
  if (typeof url === 'string' && url.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(url);
      if (Array.isArray(parsed) && parsed.length > 0) {
        url = parsed[0];
      }
    } catch {
      // ignore parse error
    }
  }

  if (typeof url !== 'string' || !url.trim()) return '';
  url = url.trim();

  // Return blob or data URLs directly (used for local uploads/previews)
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  const baseUrl = getBaseApiUrl();

  // If the URL references server uploads (/uploads/...)
  if (url.includes('/uploads/')) {
    const uploadPath = url.substring(url.indexOf('/uploads/'));
    return `${baseUrl}${uploadPath}`;
  }

  // If it's an external absolute URL (e.g. Cloudinary, Unsplash, HTTPS images)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // If external URL points to localhost on a non-localhost client (e.g. Android phone), rewrite hostname
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (url.includes('localhost:5000') || url.includes('127.0.0.1:5000')) {
        const uploadPath = url.substring(url.indexOf(':5000') + 5);
        return `${baseUrl}${uploadPath}`;
      }
    }
    return url;
  }

  // Fallback for relative paths starting with '/'
  if (url.startsWith('/')) {
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
  let raw = '';
  if (Array.isArray(product.images) && product.images.length > 0) {
    raw = product.images[0];
  } else if (product.image) {
    raw = product.image;
  }
  return resolveImageUrl(raw);
}
