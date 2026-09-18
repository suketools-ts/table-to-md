import type { Align, TableModel } from '../types';
import { columnCount, fitAligns, normalizeRows } from '../types';
import { displayWidth, padCenter, padLeft, padRight } from './width';

export interface MarkdownOptions {
  /** 列幅をそろえて出力する（等幅で読みやすい代わりに冗長になる）。 */
  pad: boolean;
}

export const DEFAULT_MARKDOWN_OPTIONS: MarkdownOptions = { pad: true };

/**
 * セルを Markdown の表内で安全な 1 行にする。
 * `|` は列の区切りになるのでエスケープし、改行はセルを壊すため `<br>` にする。
 */
export function escapeMarkdownCell(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r\n|\r|\n/g, '<br>');
}

/** 寄せを示すコロンの数。区切り行の最小幅はハイフン 3 つ + コロンぶん。 */
function colonCount(align: Align): number {
  if (align === 'center') return 2;
  return align === 'default' ? 0 : 1;
}

/** その列の区切り行が必要とする最小の幅。 */
function minDelimiterWidth(align: Align): number {
  return 3 + colonCount(align);
}

function delimiterCell(align: Align, width: number): string {
  const dashes = '-'.repeat(Math.max(3, width - colonCount(align)));
  switch (align) {
    case 'left':
      return `:${dashes}`;
    case 'right':
      return `${dashes}:`;
    case 'center':
      return `:${dashes}:`;
    default:
      return dashes;
  }
}

function alignCell(text: string, align: Align, width: number): string {
  switch (align) {
    case 'right':
      return padLeft(text, width);
    case 'center':
      return padCenter(text, width);
    default:
      return padRight(text, width);
  }
}

/** 表を GitHub Flavored Markdown の表記法に変換する。 */
export function toMarkdown(
  model: TableModel,
  options: MarkdownOptions = DEFAULT_MARKDOWN_OPTIONS,
): string {
  const rows = normalizeRows(model.rows);
  const count = columnCount(rows);
  if (count === 0) return '';
  const aligns = fitAligns(model.aligns, count);

  const cells = rows.map((row) => row.map(escapeMarkdownCell));
  const header = model.hasHeader ? cells[0] : Array.from({ length: count }, () => '');
  const body = model.hasHeader ? cells.slice(1) : cells;

  const widths = Array.from({ length: count }, (_, col) => {
    const values = [header[col] ?? '', ...body.map((row) => row[col] ?? '')];
    const max = values.reduce((acc, value) => Math.max(acc, displayWidth(value)), 0);
    // 桁をそろえるときは、区切り行が必要とする最小幅も下回らないようにする。
    return options.pad ? Math.max(max, minDelimiterWidth(aligns[col])) : max;
  });

  const line = (row: string[]) =>
    `| ${row
      .map((cell, col) => (options.pad ? alignCell(cell, aligns[col], widths[col]) : cell))
      .join(' | ')} |`;

  const out: string[] = [];
  out.push(line(header));
  out.push(
    `| ${aligns
      .map((align, col) => delimiterCell(align, options.pad ? widths[col] : 0))
      .join(' | ')} |`,
  );
  for (const row of body) out.push(line(row));

  return out.join('\n');
}
