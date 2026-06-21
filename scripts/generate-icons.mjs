/**
 * Generates PNG app icons with zero dependencies (built-in zlib only).
 * Draws the same mark as icons/icon.svg: a blue rounded square with a white
 * lightbulb and motion lines. Run with:  node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

const ACCENT = [11, 92, 255];
const LIGHT = [159, 192, 255];
const WHITE = [255, 255, 255];

/** Build an RGBA pixel buffer for one icon. `pad` is the maskable safe padding (0..0.2). */
function drawIcon(size, pad = 0) {
  const px = new Uint8ClampedArray(size * size * 4); // transparent by default
  const s = size;
  const inset = Math.round(s * pad);
  const r = Math.round(s * 0.22); // background corner radius

  const set = (x, y, [cr, cg, cb], a = 255) => {
    if (x < 0 || y < 0 || x >= s || y >= s) return;
    const i = (y * s + x) * 4;
    // simple alpha-over composite
    const ia = a / 255;
    px[i] = px[i] * (1 - ia) + cr * ia;
    px[i + 1] = px[i + 1] * (1 - ia) + cg * ia;
    px[i + 2] = px[i + 2] * (1 - ia) + cb * ia;
    px[i + 3] = Math.max(px[i + 3], a);
  };

  // rounded-rect background
  const x0 = inset, y0 = inset, x1 = s - inset, y1 = s - inset;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (insideRoundRect(x, y, x0, y0, x1, y1, r)) set(x, y, ACCENT);
    }
  }

  const cx = s * 0.52;
  const bulbCy = s * 0.42;
  const bulbR = s * 0.2;

  // motion lines (drawn under bulb, to the left)
  fillRect(set, s * 0.1, s * 0.46, s * 0.2, s * 0.5, LIGHT);
  fillRect(set, s * 0.07, s * 0.55, s * 0.22, s * 0.59, LIGHT);

  // bulb (circle)
  fillCircle(set, cx, bulbCy, bulbR, WHITE);
  // bulb base (neck + screw)
  fillRect(set, cx - bulbR * 0.45, bulbCy + bulbR * 0.75, cx + bulbR * 0.45, bulbCy + bulbR * 1.35, WHITE);
  fillRect(set, cx - bulbR * 0.3, bulbCy + bulbR * 1.35, cx + bulbR * 0.3, bulbCy + bulbR * 1.7, WHITE);

  return Buffer.from(px.buffer);
}

function insideRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x >= x0 + r && x <= x1 - r) return y >= y0 && y < y1;
  if (y >= y0 + r && y <= y1 - r) return x >= x0 && x < x1;
  const cxs = x < x0 + r ? x0 + r : x1 - r;
  const cys = y < y0 + r ? y0 + r : y1 - r;
  return (x - cxs) ** 2 + (y - cys) ** 2 <= r * r;
}
function fillRect(set, ax, ay, bx, by, color) {
  for (let y = Math.round(ay); y < Math.round(by); y++)
    for (let x = Math.round(ax); x < Math.round(bx); x++) set(x, y, color);
}
function fillCircle(set, cx, cy, r, color) {
  for (let y = Math.round(cy - r); y <= Math.round(cy + r); y++)
    for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y, color);
}

// ---- minimal PNG encoder ----
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  // add filter byte (0) at the start of each scanline
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function write(name, size, pad) {
  const rgba = drawIcon(size, pad);
  const png = encodePng(rgba, size);
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`  ${name} (${size}x${size}, ${png.length} bytes)`);
}

console.log('Generating icons →', OUT_DIR);
write('icon-192.png', 192, 0);
write('icon-512.png', 512, 0);
write('icon-maskable-512.png', 512, 0.12); // padded safe zone for maskable
console.log('Done.');
