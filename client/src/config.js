// Base API URL config
export function getBaseApiUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    // If running under Vite dev server (port 5173)
    if (window.location.port === '5173') {
      return `http://${window.location.hostname}:5000`;
    }
    // Production / preview build / same origin
    return window.location.origin;
  }
  return '';
}

export const API_URL = getBaseApiUrl();
