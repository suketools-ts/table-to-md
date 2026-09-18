import type { Align, TableModel } from './types';
import { columnCount, fitAligns, normalizeRows } from './types';

/** 行数・列数をそろえ、`aligns` を列数に合わせた表を返す。 */
export function normalizeTable(model: TableModel): TableModel {
  const rows = normalizeRows(model.rows);
  return { ...model, rows, aligns: fitAligns(model.aligns, columnCount(rows)) };
}

export function insertRow(model: TableModel, at: number): TableModel {
  const rows = normalizeRows(model.rows);
  const width = columnCount(rows);
  const index = Math.max(0, Math.min(at, rows.length));
  const next = rows.slice();
  next.splice(index, 0, Array.from({ length: width }, () => ''));
  return { ...model, rows: next };
}

export function removeRow(model: TableModel, at: number): TableModel {
  const rows = normalizeRows(model.rows);
  if (rows.length <= 1) return { ...model, rows };
  const next = rows.filter((_, index) => index !== at);
  return { ...model, rows: next };
}

export function insertColumn(model: TableModel, at: number): TableModel {
  const rows = normalizeRows(model.rows);
  const width = columnCount(rows);
  const index = Math.max(0, Math.min(at, width));
  const next = rows.map((row) => {
    const copy = row.slice();
    copy.splice(index, 0, '');
    return copy;
  });
  const aligns = fitAligns(model.aligns, width).slice();
  aligns.splice(index, 0, 'default');
  return { ...model, rows: next, aligns };
}

export function removeColumn(model: TableModel, at: number): TableModel {
  const rows = normalizeRows(model.rows);
  const width = columnCount(rows);
  if (width <= 1) return { ...model, rows };
  const next = rows.map((row) => row.filter((_, index) => index !== at));
  const aligns = fitAligns(model.aligns, width).filter((_, index) => index !== at);
  return { ...model, rows: next, aligns };
}

/** 行と列を入れ替える。寄せは列の対応が崩れるため既定に戻す。 */
export function transpose(model: TableModel): TableModel {
  const rows = normalizeRows(model.rows);
  const width = columnCount(rows);
  const next = Array.from({ length: width }, (_, col) => rows.map((row) => row[col] ?? ''));
  return { ...model, rows: next, aligns: [] };
}

/** すべてのセルが空の行・列を末尾側から取り除く。 */
export function trimEmpty(model: TableModel): TableModel {
  let rows = normalizeRows(model.rows);
  const isBlank = (values: string[]) => values.every((value) => value.trim() === '');

  while (rows.length > 1 && isBlank(rows[rows.length - 1])) rows = rows.slice(0, -1);

  let width = columnCount(rows);
  while (width > 1 && isBlank(rows.map((row) => row[width - 1] ?? ''))) {
    rows = rows.map((row) => row.slice(0, width - 1));
    width -= 1;
  }

  return { ...model, rows, aligns: fitAligns(model.aligns, width) };
}

/** すべてのセルの前後の空白を取り除く。 */
export function trimCells(model: TableModel): TableModel {
  return { ...model, rows: model.rows.map((row) => row.map((cell) => cell.trim())) };
}

export function setAlign(model: TableModel, col: number, align: Align): TableModel {
  const aligns = fitAligns(model.aligns, columnCount(normalizeRows(model.rows))).slice();
  aligns[col] = align;
  return { ...model, aligns };
}

export function setAllAligns(model: TableModel, align: Align): TableModel {
  const width = columnCount(normalizeRows(model.rows));
  return { ...model, aligns: Array.from({ length: width }, () => align) };
}

/** 空の表（1 行 1 列）。 */
export function emptyTable(rows = 3, cols = 3): TableModel {
  return {
    rows: Array.from({ length: rows }, () => Array.from({ length: cols }, () => '')),
    hasHeader: true,
    aligns: [],
  };
}
