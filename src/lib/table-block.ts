/** ソーステキストの中で表が占める範囲。`start` と `end` は文字位置。 */
export interface TableBlock {
  start: number;
  end: number;
  text: string;
}

/** `|` で始まる行を表の行とみなす（Markdown の区切り行も Backlog の見出し行もこれに当たる）。 */
function isTableLine(line: string): boolean {
  return line.trimStart().startsWith('|');
}

/** 各行の開始位置・終了位置（改行を含まない）を求める。 */
function lineSpans(text: string): Array<{ start: number; end: number; text: string }> {
  const spans: Array<{ start: number; end: number; text: string }> = [];
  let start = 0;
  for (let i = 0; i <= text.length; i += 1) {
    if (i === text.length || text[i] === '\n') {
      const end = i > start && text[i - 1] === '\r' ? i - 1 : i;
      spans.push({ start, end, text: text.slice(start, end) });
      start = i + 1;
    }
  }
  return spans;
}

/**
 * カーソル位置を含む表のブロックを探す。
 * カーソルのある行が表の行なら、そこから上下へ連続する表の行をたどって範囲を返す。
 * 表の上にいなければ null（呼び出し側は「新規作成」として扱う）。
 */
export function findTableBlockAt(text: string, caret: number): TableBlock | null {
  const lines = lineSpans(text);
  const position = Math.max(0, Math.min(caret, text.length));

  // カーソルが行末（改行の直前）にある場合もその行とみなす。
  const index = lines.findIndex((line) => position >= line.start && position <= line.end);
  if (index === -1 || !isTableLine(lines[index].text)) return null;

  let first = index;
  while (first > 0 && isTableLine(lines[first - 1].text)) first -= 1;
  let last = index;
  while (last < lines.length - 1 && isTableLine(lines[last + 1].text)) last += 1;

  const start = lines[first].start;
  const end = lines[last].end;
  return { start, end, text: text.slice(start, end) };
}

/** 文字列の末尾に続く改行の数。 */
function trailingNewlines(text: string): number {
  const match = text.match(/\n*$/);
  return match ? match[0].length : 0;
}

/** 文字列の先頭に続く改行の数。 */
function leadingNewlines(text: string): number {
  const match = text.match(/^\n*/);
  return match ? match[0].length : 0;
}

/**
 * 挿入する表の前後に、空行で区切られるだけの改行を補う。
 *
 * 表が前後の段落と地の文と続いていると、Markdown でも Backlog 記法でも
 * 隣の行が表に取り込まれたり、逆に表と認識されなかったりする。
 * すでに十分な改行があれば足さない。
 */
export function padForInsertion(
  before: string,
  after: string,
  text: string,
): string {
  const lead = before === '' ? '' : '\n'.repeat(Math.max(0, 2 - trailingNewlines(before)));
  const trail = after === '' ? '' : '\n'.repeat(Math.max(0, 2 - leadingNewlines(after)));
  return `${lead}${text}${trail}`;
}
