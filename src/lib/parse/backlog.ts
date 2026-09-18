import type { ParsedTable } from '../types';
import { splitPipeRow } from './markdown';

/**
 * Backlog 記法の表。見出し行は行末の `h`、または各セル頭の `~` で表す。
 *   | 見出し1 | 見出し2 |h
 *   | 値1     | 値2     |
 */
const HEADER_SUFFIX = /\|\s*h\s*$/i;

/** セル内の `&br;` を改行に戻し、`&#124;` をパイプに復元する。 */
function decodeCell(cell: string): string {
  return cell
    .replace(/&br;/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&#124;|&vert;/gi, '|')
    .trim();
}

/** 先頭の `~`（見出しセル記法）を取り除く。 */
function stripHeaderMark(cell: string): { text: string; header: boolean } {
  const trimmed = cell.trim();
  if (trimmed.startsWith('~')) return { text: trimmed.slice(1).trim(), header: true };
  return { text: trimmed, header: false };
}

export function looksLikeBacklogTable(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return false;
  const pipeLines = lines.filter((l) => l.trim().startsWith('|'));
  if (pipeLines.length === 0) return false;
  return pipeLines.some((l) => HEADER_SUFFIX.test(l.trim()) || /\|\s*~/.test(l));
}

export function parseBacklogTable(text: string): ParsedTable {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const rows: string[][] = [];
  let hasHeader = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const isHeaderLine = HEADER_SUFFIX.test(trimmed);
    // 行末の `|h` から `h` だけを外し、閉じの `|` は残す。
    const body = isHeaderLine ? trimmed.replace(HEADER_SUFFIX, '|') : trimmed;
    const cells = splitPipeRow(body).map((cell) => stripHeaderMark(cell));

    if ((isHeaderLine || cells.every((c) => c.header)) && index === 0) hasHeader = true;
    rows.push(cells.map((c) => decodeCell(c.text)));
  });

  return { rows, hasHeader, aligns: [] };
}
