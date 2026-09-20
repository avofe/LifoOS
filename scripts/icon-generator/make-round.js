const sharp = require('sharp');
const path = require('path');

const master = path.join(__dirname, 'icon-master.svg');
const base = path.join(__dirname, '..', '..', 'apps', 'android', 'app', 'src', 'main', 'res');
const sizes = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };

async function main() {
  for (const [dir, size] of Object.entries(sizes)) {
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#000"/></svg>`
    );
    const out = path.join(base, dir, 'ic_launcher_round.png');
    await sharp(master)
      .resize(size, size)
      .composite([{ input: mask, blend: 'dest-in' }])
      .toFile(out);
    console.log('round', dir, size + 'px', 'OK');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
