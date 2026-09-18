import { describe, expect, it } from 'vitest';
import type { TableModel } from './types';
import {
  insertColumn,
  insertRow,
  removeColumn,
  removeRow,
  setAlign,
  transpose,
  trimCells,
  trimEmpty,
} from './table-ops';

const model: TableModel = {
  rows: [
    ['a', 'b', 'c'],
    ['1', '2', '3'],
  ],
  hasHeader: true,
  aligns: ['left', 'center', 'right'],
};

describe('table-ops', () => {
  it('行を挿入する', () => {
    expect(insertRow(model, 1).rows).toEqual([
      ['a', 'b', 'c'],
      ['', '', ''],
      ['1', '2', '3'],
    ]);
  });

  it('行を削除する', () => {
    expect(removeRow(model, 0).rows).toEqual([['1', '2', '3']]);
  });

  it('最後の 1 行は削除しない', () => {
    const single: TableModel = { rows: [['x']], hasHeader: false, aligns: [] };
    expect(removeRow(single, 0).rows).toEqual([['x']]);
  });

  it('列を挿入すると寄せも一緒にずれる', () => {
    const next = insertColumn(model, 1);
    expect(next.rows[0]).toEqual(['a', '', 'b', 'c']);
    expect(next.aligns).toEqual(['left', 'default', 'center', 'right']);
  });

  it('列を削除すると寄せも一緒に落ちる', () => {
    const next = removeColumn(model, 1);
    expect(next.rows[0]).toEqual(['a', 'c']);
    expect(next.aligns).toEqual(['left', 'right']);
  });

  it('行と列を入れ替える', () => {
    expect(transpose(model).rows).toEqual([
      ['a', '1'],
      ['b', '2'],
      ['c', '3'],
    ]);
  });

  it('末尾の空行・空列を落とす', () => {
    const padded: TableModel = {
      rows: [
        ['a', 'b', ''],
        ['1', '2', ''],
        ['', '', ''],
      ],
      hasHeader: true,
      aligns: [],
    };
    const next = trimEmpty(padded);
    expect(next.rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(next.aligns).toHaveLength(2);
  });

  it('セルの前後の空白を落とす', () => {
    const spaced: TableModel = { rows: [[' a ', '\tb']], hasHeader: false, aligns: [] };
    expect(trimCells(spaced).rows).toEqual([['a', 'b']]);
  });

  it('寄せを 1 列だけ変える', () => {
    expect(setAlign(model, 0, 'center').aligns).toEqual(['center', 'center', 'right']);
  });
});
