#!/usr/bin/env node
// Crops a region from a PNG and scales it up (nearest neighbour) for close inspection.
//
//   node crop.mjs <in.png> <x> <y> <w> <h> [scale=2] [out.png]
import fs from 'node:fs/promises';
import { PNG } from 'pngjs';

const [input, x, y, w, h, scaleArg = '2', output] = process.argv.slice(2);
if (!input || h === undefined) {
  console.error('usage: node crop.mjs <in.png> <x> <y> <w> <h> [scale=2] [out.png]');
  process.exit(1);
}
const src = PNG.sync.read(await fs.readFile(input));
const scale = Math.max(1, Math.round(Number(scaleArg)));
const [cx, cy] = [Math.max(0, +x), Math.max(0, +y)];
const cw = Math.min(+w, src.width - cx);
const ch = Math.min(+h, src.height - cy);
const out = new PNG({ width: cw * scale, height: ch * scale });
for (let oy = 0; oy < out.height; oy++) {
  for (let ox = 0; ox < out.width; ox++) {
    const si = ((cy + Math.floor(oy / scale)) * src.width + cx + Math.floor(ox / scale)) * 4;
    src.data.copy(out.data, (oy * out.width + ox) * 4, si, si + 4);
  }
}
const dest = output || input.replace(/\.png$/, `_crop_${cx}_${cy}_${cw}x${ch}@${scale}x.png`);
await fs.writeFile(dest, PNG.sync.write(out));
console.log(dest);
