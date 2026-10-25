// Generates icons/icon-192.png and icons/icon-512.png (phones need PNG home-screen icons).
// Zero dependencies: draws the same shapes as icons/icon.svg and writes PNGs with Node's zlib.
// Usage: node scripts/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GREEN = [0x1f, 0x7a, 0x5a];
const WHITE = [0xff, 0xff, 0xff];

// Color at a point in the 512×512 design space, or null if transparent.
function shade(x, y) {
  const r = 112;
  const cx = Math.min(Math.max(x, r), 512 - r);
  const cy = Math.min(Math.max(y, r), 512 - r);
  if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null; // outside rounded square

  const d = Math.hypot(x - 256, y - 276);
  if (Math.abs(d - 150) <= 18) return WHITE; // plate ring

  // leaf: ellipse rotated 45°
  const lx = x - 299, ly = y - 83;
  const u = (lx - ly) / Math.SQRT2, v = (lx + ly) / Math.SQRT2;
  if ((u / 62) ** 2 + (v / 24) ** 2 <= 1) return WHITE;

  return GREEN;
}

function render(size) {
  const ss = 4; // supersampling for smooth edges
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = shade(((px + (sx + 0.5) / ss) * 512) / size, ((py + (sy + 0.5) / ss) * 512) / size);
          if (c) { rr += c[0]; gg += c[1]; bb += c[2]; aa++; }
        }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4;
      raw[o] = aa ? rr / aa : 0;
      raw[o + 1] = aa ? gg / aa : 0;
      raw[o + 2] = aa ? bb / aa : 0;
      raw[o + 3] = Math.round((aa / (ss * ss)) * 255);
    }
  }
  return png(size, size, raw);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'icons');
for (const size of [192, 512]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), render(size));
  console.log(`wrote icons/icon-${size}.png`);
}
