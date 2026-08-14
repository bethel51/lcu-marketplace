import { API_URL } from '../config';

/**
 * Resolves a product image URL so it always points to an absolute URL.
 * - If the url starts with 'http' or 'blob:', return as-is (already absolute).
 * - If it starts with '/' it's a relative server path → prepend API_URL.
 * - Otherwise return empty string (no image).
 */
export function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${API_URL}${url}`;
  return url;
}

/**
 * Returns the best display image URL for a product object.
 * Uses `images[0]` if available, falls back to `image`.
 */
export function getProductImage(product) {
  if (!product) return '';
  const raw = (product.images && product.images.length > 0)
    ? product.images[0]
    : (product.image || '');
  return resolveImageUrl(raw);
}
