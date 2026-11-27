"use strict";
// Decodificador mínimo de PNG RGBA 8 bits (sem entrelaçamento), copiado de state-agent-icons.test.js.
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodeRgbaPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.strictEqual(buffer.toString("ascii", 1, 4), "PNG");
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const interlace = buffer[28];
  assert.strictEqual(bitDepth, 8, `${path.basename(filePath)} should use 8-bit channels`);
  assert.strictEqual(colorType, 6, `${path.basename(filePath)} should be encoded as RGBA`);
  assert.strictEqual(interlace, 0, `${path.basename(filePath)} should not be interlaced`);

  const idatChunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") {
      idatChunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }

  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const encoded = zlib.inflateSync(Buffer.concat(idatChunks));
  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let encodedOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = encoded[encodedOffset];
    encodedOffset += 1;
    assert.ok(filter >= 0 && filter <= 4, `Unsupported PNG filter ${filter}`);

    for (let x = 0; x < rowBytes; x += 1) {
      const targetIndex = y * rowBytes + x;
      const left = x >= bytesPerPixel ? pixels[targetIndex - bytesPerPixel] : 0;
      const above = y > 0 ? pixels[targetIndex - rowBytes] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[targetIndex - rowBytes - bytesPerPixel]
        : 0;
      const encodedValue = encoded[encodedOffset];
      encodedOffset += 1;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = above;
      if (filter === 3) predictor = Math.floor((left + above) / 2);
      if (filter === 4) predictor = paethPredictor(left, above, upperLeft);
      pixels[targetIndex] = (encodedValue + predictor) & 0xff;
    }
  }

  return { width, height, pixels };
}

module.exports = { decodeRgbaPng };
