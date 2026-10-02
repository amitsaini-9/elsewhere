const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs/promises');

(async () => {
  const directory = path.join(__dirname, '../public/media');
  for (const name of ['hero', 'forest', 'coast', 'hills']) {
    const input = path.join(directory, `${name}.png`);
    const output = path.join(directory, `${name}.webp`);
    await sharp(input).webp({ quality: 84, effort: 5 }).toFile(output);
    const [before, after] = await Promise.all([fs.stat(input), fs.stat(output)]);
    console.log(`${name}: ${Math.round(before.size / 1024)} KB → ${Math.round(after.size / 1024)} KB`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
