#!/usr/bin/env node
// Builds a downscaled contact sheet from several PNGs (box-filter downsample).
//
//   node sheet.mjs <out.png> <scale 0-1> <cols> <a.png> <b.png> ...
import fs from 'node:fs/promises';
import { PNG } from 'pngjs';

const [out, scaleArg, colsArg, ...files] = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node sheet.mjs <out.png> <scale> <cols> <files...>');
  process.exit(1);
}
const scale = Number(scaleArg);
const cols = Number(colsArg);
const GAP = 6;

function downscale(img) {
  const f = Math.max(1, Math.round(1 / scale));
  const w = Math.floor(img.width / f), h = Math.floor(img.height / f);
  const o = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const acc = [0, 0, 0, 0];
      for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) {
        const i = ((y * f + dy) * img.width + x * f + dx) * 4;
        for (let c = 0; c < 4; c++) acc[c] += img.data[i + c];
      }
      const j = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) o.data[j + c] = acc[c] / (f * f);
    }
  }
  return o;
}

const imgs = [];
for (const f of files) imgs.push(downscale(PNG.sync.read(await fs.readFile(f))));
const cw = Math.max(...imgs.map((i) => i.width));
const ch = Math.max(...imgs.map((i) => i.height));
const rows = Math.ceil(imgs.length / cols);
const sheet = new PNG({ width: cols * cw + (cols - 1) * GAP, height: rows * ch + (rows - 1) * GAP });
for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([255, 0, 255, 255], i);
imgs.forEach((img, n) => {
  const ox = (n % cols) * (cw + GAP), oy = Math.floor(n / cols) * (ch + GAP);
  for (let y = 0; y < img.height; y++) img.data.copy(sheet.data, ((oy + y) * sheet.width + ox) * 4, y * img.width * 4, (y + 1) * img.width * 4);
});
await fs.writeFile(out, PNG.sync.write(sheet));
console.log(out, `${sheet.width}x${sheet.height}`);
