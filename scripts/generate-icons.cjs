const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG Builder
function createPNG(width, height, isMaskable) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'binary');
    const cData = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(cData), 0);
    return Buffer.concat([len, t, data, crc]);
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const raw = Buffer.alloc(height * (width * 4 + 1));
  const cx = width / 2;
  const cy = height / 2;
  const rCorner = isMaskable ? 0 : width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0; // Filter 0: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Check rounded corner bounds if not maskable
      let inside = true;
      if (!isMaskable) {
        let dx = 0, dy = 0;
        if (x < rCorner) dx = rCorner - x;
        else if (x > width - rCorner) dx = x - (width - rCorner);
        if (y < rCorner) dy = rCorner - y;
        else if (y > height - rCorner) dy = y - (height - rCorner);
        if (dx > 0 && dy > 0) {
          inside = (dx * dx + dy * dy) <= (rCorner * rCorner);
        }
      }

      if (!inside) {
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0;
        continue;
      }

      // Linear gradient from #6a4cff (106, 76, 255) to #ec5fa0 (236, 95, 160) to #ff8a3d (255, 138, 61)
      const t = (x + y) / (width + height);
      let r, g, b;
      if (t < 0.65) {
        const u = t / 0.65;
        r = Math.round(106 + (236 - 106) * u);
        g = Math.round(76 + (95 - 76) * u);
        b = Math.round(255 + (160 - 255) * u);
      } else {
        const u = (t - 0.65) / 0.35;
        r = Math.round(236 + (255 - 236) * u);
        g = Math.round(95 + (138 - 95) * u);
        b = Math.round(160 + (61 - 160) * u);
      }

      // Circular ring in center
      const dist = Math.hypot(x - cx, y - cy);
      const ringRadius = width * (isMaskable ? 0.32 : 0.36);
      const ringThick = Math.max(2, width * 0.024);

      if (Math.abs(dist - ringRadius) < ringThick) {
        // White circular accent
        r = 255; g = 255; b = 255;
      }

      // Center graduation cap stylized diamond:
      // Center at (cx, cy * 0.95), width = 2*rx, height = 2*ry
      const scale = isMaskable ? 0.68 : 0.85;
      const capY = cy - height * 0.04;
      const diamondW = width * 0.28 * scale;
      const diamondH = height * 0.14 * scale;

      const normX = Math.abs(x - cx) / diamondW;
      const normY = Math.abs(y - capY) / diamondH;
      if (normX + normY <= 1.0) {
        // Inside graduation cap diamond
        r = 255; g = 255; b = 255;
      }

      // Cap lower base
      const baseY = capY + diamondH * 0.5;
      const baseW = diamondW * 0.62;
      const baseH = height * 0.09 * scale;
      if (y >= baseY && y <= baseY + baseH && Math.abs(x - cx) <= baseW) {
        r = 240; g = 240; b = 255;
      }

      // Tassel
      const tasselX = cx - diamondW * 0.75;
      if (Math.abs(x - tasselX) <= Math.max(1, width * 0.012) && y >= capY && y <= capY + baseH * 1.5) {
        r = 255; g = 213; b = 74; // Gold tassel
      }
      if (Math.hypot(x - tasselX, y - (capY + baseH * 1.5)) <= Math.max(2, width * 0.025)) {
        r = 255; g = 213; b = 74;
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = 255;
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const pubDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
console.log('Successfully generated all PWA icons!');
