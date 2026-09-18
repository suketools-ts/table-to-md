/**
 * 拡張機能のアイコン (dist-extension/icon128.png) を生成する。
 * 画像を 1 枚置くためだけに変換ツールを増やしたくないので、
 * Node だけで完結するよう PNG を直接組み立てる。
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SIZE = 128;
const BG = [47, 109, 246, 255]; // #2f6df6
const FG = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];
const RADIUS = 24;

/** 角丸の外側か。四隅の円の中心からの距離で判定する。 */
function outsideRoundedRect(x, y) {
  const cx = Math.min(Math.max(x, RADIUS), SIZE - 1 - RADIUS);
  const cy = Math.min(Math.max(y, RADIUS), SIZE - 1 - RADIUS);
  return Math.hypot(x - cx, y - cy) > RADIUS;
}

/** 表の枠線（外枠 + 見出しの横線 + 縦線 2 本）の上か。 */
function onTableLines(x, y) {
  const [left, right, top, bottom] = [26, 102, 28, 100];
  const stroke = 7;
  const near = (v, target) => Math.abs(v - target) < stroke / 2;
  const insideX = x >= left && x <= right;
  const insideY = y >= top && y <= bottom;
  if (!insideX || !insideY) return false;
  if (near(x, left) || near(x, right) || near(y, top) || near(y, bottom)) return true;
  if (near(y, top + 22)) return true; // 見出し行の下線
  return (near(x, left + 26) || near(x, left + 51)) && y >= top + 22;
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let pos = 0;
for (let y = 0; y < SIZE; y += 1) {
  raw[pos] = 0; // フィルタ種別: なし
  pos += 1;
  for (let x = 0; x < SIZE; x += 1) {
    const color = outsideRoundedRect(x, y) ? CLEAR : onTableLines(x, y) ? FG : BG;
    raw.set(color, pos);
    pos += 4;
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // ビット深度
ihdr[9] = 6; // カラータイプ: RGBA

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = fileURLToPath(new URL('../dist-extension/icon128.png', import.meta.url));
writeFileSync(out, png);
console.log(`icon128.png を生成しました (${png.length} バイト)`);
