const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const MASTER = path.join(__dirname, 'icon-master.svg');
const tmpDir = path.join(__dirname, 'gen');
fs.mkdirSync(tmpDir, { recursive: true });

async function gen(name, size, dest, { round = false } = {}) {
  let img = sharp(MASTER).resize(size, size, { fit: 'cover' });
  if (round) {
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#000"/></svg>`);
    img = img.composite([{ input: mask, blend: 'dest-in' }]);
  }
  await img.toFile(dest);
  console.log(`✓ ${name}: ${size}px -> ${path.relative(ROOT, dest)}`);
}

async function main() {
  const web = path.join(ROOT, 'apps', 'web', 'public');
  const desktop = path.join(ROOT, 'apps', 'desktop', 'src-tauri', 'icons');

  // Web
  await gen('favicon', 32, path.join(web, 'favicon.png'));
  await gen('web-192', 192, path.join(web, 'icon-192.png'));
  await gen('web-512', 512, path.join(web, 'icon-512.png'));

  // Desktop (Tauri)
  await gen('desktop-32', 32, path.join(desktop, '32x32.png'));
  await gen('desktop-128', 128, path.join(desktop, '128x128.png'));
  await gen('desktop-128@2x', 256, path.join(desktop, '128x128@2x.png'));

  // ICO (Windows): sharp делает ICO только через toFile с .ico в v0.33+
  try {
    const ico = path.join(desktop, 'icon.ico');
    await sharp(MASTER).resize(256, 256).toFile(ico);
    console.log(`✓ icon.ico: 256px -> ${path.relative(ROOT, ico)}`);
  } catch (e) {
    console.log('! icon.ico через sharp не удалось, попробую иначе:', e.message);
  }

  // Android mipmap
  const res = path.join(ROOT, 'apps', 'android', 'app', 'src', 'main', 'res');
  const sizes = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };
  for (const [dir, size] of Object.entries(sizes)) {
    const d = path.join(res, dir);
    fs.mkdirSync(d, { recursive: true });
    await gen(`android-${dir}`, size, path.join(d, 'ic_launcher.png'));
  }

  // Telegram (аватарка 512, круглой не надо — BotFather сам)
  await gen('telegram', 512, path.join(__dirname, 'gen', 'telegram-bot.png'));
  console.log('\nГотово! Telegram-аватарка: scripts/icon-generator/gen/telegram-bot.png');
}

main().catch(e => { console.error(e); process.exit(1); });
