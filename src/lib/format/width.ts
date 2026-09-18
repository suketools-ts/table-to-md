/**
 * 全角文字を 2 桁として数える表示幅。
 * 桁揃えした Markdown を等幅フォントで見たときに列が揃うようにするため、
 * East Asian Width の Wide / Fullwidth を 2、それ以外を 1 として数える。
 * 結合文字（濁点など）は 0 桁、サロゲートペアは 1 文字として扱う。
 */
const WIDE = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xa960, 0xa97f],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1b000, 0x1b001],
  [0x1f200, 0x1f251],
  [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x3fffd],
] as const;

const COMBINING = [
  [0x0300, 0x036f],
  [0x1ab0, 0x1aff],
  [0x20d0, 0x20ff],
  [0x3099, 0x309a],
  [0xfe00, 0xfe0f],
  [0xfe20, 0xfe2f],
] as const;

function inRanges(code: number, ranges: ReadonlyArray<readonly [number, number]>): boolean {
  for (const [start, end] of ranges) {
    if (code < start) return false;
    if (code <= end) return true;
  }
  return false;
}

export function charWidth(code: number): number {
  if (inRanges(code, COMBINING)) return 0;
  return inRanges(code, WIDE) ? 2 : 1;
}

/** 文字列の表示幅（全角 = 2 桁）。 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += charWidth(ch.codePointAt(0) ?? 0);
  return width;
}

/** 表示幅を `target` にそろえるまで右側に空白を足す。 */
export function padRight(text: string, target: number): string {
  return text + ' '.repeat(Math.max(0, target - displayWidth(text)));
}

/** 表示幅を `target` にそろえるまで左側に空白を足す。 */
export function padLeft(text: string, target: number): string {
  return ' '.repeat(Math.max(0, target - displayWidth(text))) + text;
}

/** 表示幅を `target` にそろえるまで左右に空白を振り分ける（余りは右に寄せる）。 */
export function padCenter(text: string, target: number): string {
  const space = Math.max(0, target - displayWidth(text));
  const left = Math.floor(space / 2);
  return ' '.repeat(left) + text + ' '.repeat(space - left);
}
