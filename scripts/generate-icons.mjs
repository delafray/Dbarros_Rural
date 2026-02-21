import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const srcIcon = 'C:/Users/ronal/.gemini/antigravity/brain/fc04d0cf-9a97-40f9-a56c-4bfed926ed92/pwa_icon_1771683860843.png';
const outDir = './public/icons';

fs.mkdirSync(outDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
    await sharp(srcIcon)
        .resize(size, size)
        .png()
        .toFile(path.join(outDir, `icon-${size}x${size}.png`));
    console.log(`✓ icon-${size}x${size}.png`);
}

// Apple touch icon (180x180)
await sharp(srcIcon).resize(180, 180).png().toFile('./public/apple-touch-icon.png');
console.log('✓ apple-touch-icon.png');

// Favicon 32x32
await sharp(srcIcon).resize(32, 32).png().toFile('./public/favicon-32x32.png');
console.log('✓ favicon-32x32.png');

console.log('\n🎉 All icons generated!');
