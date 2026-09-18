import type { TableModel } from '../types';
import { columnCount, normalizeRows } from '../types';
import { displayWidth, padRight } from './width';

export interface BacklogOptions {
  /** 列幅をそろえて出力する。 */
  pad: boolean;
  /**
   * 見出し行の書き方。
   * - `suffix`: 行末に `h` を付ける（`| a | b |h`）
   * - `tilde` : 各セルの頭に `~` を付ける（`|~a|~b|`）
   */
  headerStyle: 'suffix' | 'tilde';
}

export const DEFAULT_BACKLOG_OPTIONS: BacklogOptions = { pad: true, headerStyle: 'suffix' };

/**
 * セルを Backlog 記法の表内で安全な 1 行にする。
 * `|` は列の区切りなので文字実体参照にし、改行は Backlog がセル内改行に使う `&br;` にする。
 */
export function escapeBacklogCell(value: string): string {
  return value.replace(/\|/g, '&#124;').replace(/\r\n|\r|\n/g, '&br;');
}

/** 表を Backlog 記法に変換する。Backlog 記法に列の寄せ指定は無いため `aligns` は使わない。 */
export function toBacklog(
  model: TableModel,
  options: BacklogOptions = DEFAULT_BACKLOG_OPTIONS,
): string {
  const rows = normalizeRows(model.rows);
  const count = columnCount(rows);
  if (count === 0) return '';

  const cells = rows.map((row) => row.map(escapeBacklogCell));
  const useTilde = model.hasHeader && options.headerStyle === 'tilde';
  const decorated = cells.map((row, rowIndex) =>
    row.map((cell) => (useTilde && rowIndex === 0 ? `~${cell}` : cell)),
  );

  const widths = Array.from({ length: count }, (_, col) =>
    decorated.reduce((acc, row) => Math.max(acc, displayWidth(row[col] ?? '')), 0),
  );

  return decorated
    .map((row, rowIndex) => {
      const body = `| ${row
        .map((cell, col) => (options.pad ? padRight(cell, widths[col]) : cell))
        .join(' | ')} |`;
      const isHeader = model.hasHeader && rowIndex === 0 && options.headerStyle === 'suffix';
      return isHeader ? `${body}h` : body;
    })
    .join('\n');
}
