import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { API_URL } from './config'

// Monkey-patch window.fetch to dynamically rewrite image URLs
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch(...args);
  const requestUrl = args[0];
  const isApiCall = typeof requestUrl === 'string' && requestUrl.includes('/api/');

  if (isApiCall && response.ok) {
    const clonedResponse = response.clone();
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await clonedResponse.json();

        // Recursively search and rewrite paths containing /uploads/
        const rewriteImages = (obj) => {
          if (obj === null || obj === undefined) return obj;
          if (Array.isArray(obj)) {
            return obj.map(rewriteImages);
          }
          if (typeof obj === 'object') {
            const newObj = {};
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = rewriteImages(obj[key]);
              }
            }
            return newObj;
          }
          if (typeof obj === 'string' && obj.includes('/uploads/')) {
            const match = obj.match(/\/uploads\/[^\s?#]+/);
            if (match) {
              return `${API_URL}${match[0]}`;
            }
          }
          return obj;
        };

        const modifiedData = rewriteImages(data);
        return new Response(JSON.stringify(modifiedData), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
    } catch (e) {
      console.error('Error rewriting API image URLs:', e);
    }
  }
  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
