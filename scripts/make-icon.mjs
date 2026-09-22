/**
 * 拡張機能のアイコン (dist-extension/icon{16,32,48,128}.png) を生成する。
 * 画像を数枚置くためだけに変換ツールを増やしたくないので、
 * Node だけで完結するよう PNG を直接組み立てる。
 *
 * 図形は 128 px を基準に決めて、他のサイズは倍率をかけて描く。小さいサイズでは
 * 線が 1 px を割って消えてしまうため、線の太さに下限を設ける。輪郭のギザつきは
 * 1 ピクセルを SS×SS に分けて標本を取り、平均して均す。
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SIZES = [16, 32, 48, 128];
const SS = 4; // 1 ピクセルあたりの標本数（縦横）

const BASE = 128;
const BG = [47, 109, 246, 255]; // #2f6df6
const FG = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];
const RADIUS = 24;
const STROKE = 7;
const RECT = { left: 26, right: 102, top: 28, bottom: 100 };

/** 角丸の外側か。四隅の円の中心からの距離で判定する。 */
function outsideRoundedRect(x, y, size) {
  const r = (RADIUS * size) / BASE;
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return Math.hypot(x - cx, y - cy) > r;
}

/** 表の枠線（外枠 + 見出しの横線 + 縦線 2 本）の上か。 */
function onTableLines(x, y, size) {
  const k = size / BASE;
  const [left, right, top, bottom] = [RECT.left * k, RECT.right * k, RECT.top * k, RECT.bottom * k];
  // 16 px では本来の太さが 1 px を割るので、そこで下限を効かせる。
  const stroke = Math.max(STROKE * k, 1);
  const near = (v, target) => Math.abs(v - target) < stroke / 2;
  if (x < left || x > right || y < top || y > bottom) return false;
  if (near(x, left) || near(x, right) || near(y, top) || near(y, bottom)) return true;
  if (near(y, top + 22 * k)) return true; // 見出し行の下線
  return (near(x, left + 26 * k) || near(x, left + 51 * k)) && y >= top + 22 * k;
}

/**
 * 1 ピクセルぶんの色を決める。標本を平均するときは、透明な標本に引きずられて
 * 縁が暗くならないよう、アルファを乗じた値で足してから割り戻す。
 */
function samplePixel(px, py, size) {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (let j = 0; j < SS; j += 1) {
    for (let i = 0; i < SS; i += 1) {
      const x = px + (i + 0.5) / SS;
      const y = py + (j + 0.5) / SS;
      const color = outsideRoundedRect(x, y, size)
        ? CLEAR
        : onTableLines(x, y, size)
          ? FG
          : BG;
      const alpha = color[3] / 255;
      r += color[0] * alpha;
      g += color[1] * alpha;
      b += color[2] * alpha;
      a += color[3];
    }
  }
  if (a === 0) return CLEAR;
  const weight = a / 255;
  return [Math.round(r / weight), Math.round(g / weight), Math.round(b / weight), Math.round(a / (SS * SS))];
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

/** サイズを指定して PNG のバイト列を組み立てる。 */
function renderPng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let pos = 0;
  for (let y = 0; y < size; y += 1) {
    raw[pos] = 0; // フィルタ種別: なし
    pos += 1;
    for (let x = 0; x < size; x += 1) {
      raw.set(samplePixel(x, y, size), pos);
      pos += 4;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // ビット深度
  ihdr[9] = 6; // カラータイプ: RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const made = SIZES.map((size) => {
  const png = renderPng(size);
  const out = fileURLToPath(new URL(`../dist-extension/icon${size}.png`, import.meta.url));
  writeFileSync(out, png);
  return `icon${size}.png (${png.length} バイト)`;
});
console.log(`アイコンを生成しました: ${made.join(', ')}`);
