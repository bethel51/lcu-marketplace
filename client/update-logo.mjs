import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const logoSrc = "C:/Users/HP/.gemini/antigravity-ide/brain/6d80e7d4-ec6c-46b1-a8de-77fb4beb9bf2/media__1786390744949.jpg";

if (!fs.existsSync(logoSrc)) {
  console.error("ERROR: Logo source file not found at:", logoSrc);
  process.exit(1);
}

const targets = [
  path.join(__dirname, 'public/logo.png'),
  path.join(__dirname, 'assets/logo.png'),
];

// PWA icons
const sizes = [48, 72, 96, 128, 192, 256, 512];
for (const s of sizes) {
  targets.push(path.join(__dirname, `icons/icon-${s}.webp`));
}

let successCount = 0;
for (const dest of targets) {
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(logoSrc, dest);
    console.log(`✅  Copied → ${dest}`);
    successCount++;
  } catch (e) {
    console.warn(`⚠️  Skipped ${dest}: ${e.message}`);
  }
}

console.log(`\nDone! Updated ${successCount}/${targets.length} logo files.`);
