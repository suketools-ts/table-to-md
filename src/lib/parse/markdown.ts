import type { Align, ParsedTable } from '../types';

/** Markdown の区切り行（`| --- | :---: |`）かどうか。 */
const DELIMITER_CELL = /^:?-{1,}:?$/;

/**
 * `|` 区切りの 1 行をセルに分解する。`\|` と `\\` はエスケープとして解く。
 * 行頭・行末の `|` は境界とみなして取り除く。
 */
export function splitPipeRow(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '\\' && (line[i + 1] === '|' || line[i + 1] === '\\')) {
      cell += line[i + 1];
      i += 1;
      continue;
    }
    if (ch === '|') {
      cells.push(cell);
      cell = '';
      continue;
    }
    cell += ch;
  }
  cells.push(cell);

  // 行頭 `|` による先頭の空セル、行末 `|` による末尾の空セルを落とす。
  if (cells.length > 1 && cells[0].trim() === '' && line.trimStart().startsWith('|')) cells.shift();
  if (cells.length > 1 && cells[cells.length - 1].trim() === '' && line.trimEnd().endsWith('|')) {
    cells.pop();
  }
  return cells.map((c) => c.trim());
}

function parseAlign(cell: string): Align {
  const trimmed = cell.trim();
  const left = trimmed.startsWith(':');
  const right = trimmed.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return 'default';
}

/**
 * Markdown の区切り行かどうか。
 * `|` を含むことを必須にしているのは、水平線（`----`）を区切り行と取り違えないため。
 */
export function isMarkdownDelimiterRow(line: string): boolean {
  if (!line.includes('|')) return false;
  const cells = splitPipeRow(line);
  return cells.length > 0 && cells.every((cell) => DELIMITER_CELL.test(cell.trim()));
}

/** セル内の `<br>` を改行に戻し、HTML 実体参照のパイプを復元する。 */
function decodeCell(cell: string): string {
  return cell
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&#124;|&vert;/gi, '|')
    .trim();
}

export function looksLikeMarkdownTable(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return false;
  return lines.some(isMarkdownDelimiterRow);
}

/**
 * Markdown の表を取り込む。区切り行が見つかればその 1 行前を見出し行、
 * 寄せは区切り行のコロンから読み取る。区切り行が無い場合も `|` 区切りとして
 * 読み込み、見出しなしとして扱う。
 */
export function parseMarkdownTable(text: string): ParsedTable {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const rows: string[][] = [];
  let aligns: Align[] = [];
  let hasHeader = false;
  let delimiterSeen = false;

  for (const line of lines) {
    const cells = splitPipeRow(line);
    if (!delimiterSeen && isMarkdownDelimiterRow(line) && rows.length > 0) {
      aligns = cells.map(parseAlign);
      hasHeader = true;
      delimiterSeen = true;
      continue;
    }
    rows.push(cells.map(decodeCell));
  }

  return { rows, hasHeader, aligns };
}
