// Generates simple branded PNG icons without external dependencies.
// Draws a rounded gradient background with a stylized "E" glyph.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function makePng(size, filename) {
  const channels = 4;
  const data = Buffer.alloc(size * size * channels);

  const c1 = [37, 99, 235];   // brand blue
  const c2 = [124, 58, 237];  // brand purple

  function setPixel(x, y, r, g, b, a) {
    const i = (y * size + x) * channels;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
  }

  const radius = size * 0.18;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // rounded corners -> transparent outside radius
      const inCorner =
        (x < radius && y < radius && dist(x, y, radius, radius) > radius) ||
        (x > size - radius && y < radius && dist(x, y, size - radius, radius) > radius) ||
        (x < radius && y > size - radius && dist(x, y, radius, size - radius) > radius) ||
        (x > size - radius && y > size - radius && dist(x, y, size - radius, size - radius) > radius);
      if (inCorner) { setPixel(x, y, 0, 0, 0, 0); continue; }

      const t = (x + y) / (2 * size);
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      setPixel(x, y, r, g, b, 255);
    }
  }

  // Draw a chunky "E"
  const white = [255, 255, 255];
  const m = size * 0.28;            // left/top margin
  const w = size * 0.44;            // E width
  const h = size * 0.44;            // E height
  const thick = size * 0.085;       // stroke thickness
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const within = x >= m && x <= m + w && y >= m && y <= m + h;
      if (!within) continue;
      const vBar = x <= m + thick;
      const top = y <= m + thick;
      const mid = Math.abs(y - (m + h / 2)) <= thick / 2;
      const bot = y >= m + h - thick;
      if (vBar || top || mid || bot) setPixel(x, y, white[0], white[1], white[2], 255);
    }
  }

  fs.writeFileSync(filename, encodePng(size, size, data));
}

function dist(x, y, cx, cy) { return Math.hypot(x - cx, y - cy); }

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  // filter byte per row
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, dataBuf) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dataBuf.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, dataBuf])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, dataBuf, crc]);
}

const crcTable = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const out = path.join(__dirname, '..', 'src', 'assets', 'icons');
fs.mkdirSync(out, { recursive: true });
makePng(192, path.join(out, 'icon-192.png'));
makePng(512, path.join(out, 'icon-512.png'));
makePng(180, path.join(out, 'apple-touch-icon.png'));
console.log('Icons generated in', out);
