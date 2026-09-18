/** 列の寄せ方。Markdown の区切り行 (`:---`, `:---:`, `---:`) に対応する。 */
export type Align = 'default' | 'left' | 'center' | 'right';

/** アプリ全体で扱う表のモデル。`rows` は矩形とは限らない（ギザギザを許す）。 */
export interface TableModel {
  /** セルの値。`hasHeader` が true のとき `rows[0]` が見出し行。 */
  rows: string[][];
  /** 1 行目を見出しとして扱うか。 */
  hasHeader: boolean;
  /** 列ごとの寄せ。列数より短い場合は 'default' とみなす。 */
  aligns: Align[];
}

/** 入力テキストを解釈した結果。寄せの情報を持たない形式では `aligns` は空配列。 */
export interface ParsedTable {
  rows: string[][];
  hasHeader: boolean;
  aligns: Align[];
}

/** 取り込み時に判定・指定する入力形式。 */
export type InputFormat = 'auto' | 'html' | 'markdown' | 'backlog' | 'csv' | 'tsv';

export const EMPTY_TABLE: TableModel = { rows: [['']], hasHeader: true, aligns: [] };

/** 行を最長行に合わせて矩形に揃える。空の入力は 1x1 の空表にする。 */
export function normalizeRows(rows: string[][]): string[][] {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (width === 0) return [['']];
  return rows.map((row) => {
    const next = row.slice(0, width);
    while (next.length < width) next.push('');
    return next;
  });
}

/** 表の列数（最長行の長さ）。 */
export function columnCount(rows: string[][]): number {
  return rows.reduce((max, row) => Math.max(max, row.length), 0);
}

/** `aligns` を列数ぶんに伸縮させる。 */
export function fitAligns(aligns: Align[], count: number): Align[] {
  const next = aligns.slice(0, count);
  while (next.length < count) next.push('default');
  return next;
}
