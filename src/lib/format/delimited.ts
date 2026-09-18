import type { TableModel } from '../types';
import { normalizeRows } from '../types';
import type { Delimiter } from '../parse/delimited';

/**
 * RFC 4180 に沿って 1 セルを書き出す。区切り文字・改行・ダブルクォートを含むセルは
 * 全体をクォートし、内側のダブルクォートは `""` に重ねる。
 */
export function escapeDelimitedCell(value: string, delimiter: Delimiter): string {
  const needsQuote =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r');
  return needsQuote ? `"${value.replace(/"/g, '""')}"` : value;
}

/** 表を CSV / TSV に変換する。見出し行の有無にかかわらず全行を出力する。 */
export function toDelimited(model: TableModel, delimiter: Delimiter): string {
  return normalizeRows(model.rows)
    .map((row) => row.map((cell) => escapeDelimitedCell(cell, delimiter)).join(delimiter))
    .join('\n');
}

export const toCsv = (model: TableModel): string => toDelimited(model, ',');
export const toTsv = (model: TableModel): string => toDelimited(model, '\t');
