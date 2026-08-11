import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Copy the new logo file sent by the user to public, assets, and app icon folders
const logoSrc = "C:/Users/HP/.gemini/antigravity-ide/brain/6d80e7d4-ec6c-46b1-a8de-77fb4beb9bf2/media__1786390744949.jpg";
if (fs.existsSync(logoSrc)) {
  try {
    fs.copyFileSync(logoSrc, "./public/logo.png");
    fs.copyFileSync(logoSrc, "./assets/logo.png");
    
    // Overwrite PWA webp icons with the new logo
    const sizes = [48, 72, 96, 128, 192, 256, 512];
    for (const s of sizes) {
      const destPath = `./icons/icon-${s}.webp`;
      if (fs.existsSync(destPath) || fs.existsSync(path.dirname(destPath))) {
        fs.copyFileSync(logoSrc, destPath);
      }
    }
    console.log("LCU Logo Updater: Successfully updated all logos and PWA icons.");
  } catch (e) {
    console.error("LCU Logo Updater Error:", e);
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit (our dashboard is legitimately large)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunk splitting — separates vendor libs from app code
        manualChunks(id) {
          // React core in its own chunk — cached by browser across deploys
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // Router in its own chunk
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }
          // Everything else from node_modules
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
