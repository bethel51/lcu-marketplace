import fs from 'fs';
import path from 'path';

const source = "C:/Users/HP/.gemini/antigravity-ide/brain/c52f3c75-1f4b-4ba0-8373-1e245ed9e910/media__1786264276313.png";
const dest = "./assets/logo.png";

try {
  fs.copyFileSync(source, dest);
  console.log("Logo successfully copied to assets/logo.png!");
} catch (err) {
  console.error("Error copying logo:", err);
}
