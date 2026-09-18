import { describe, expect, it } from 'vitest';
import type { TableModel } from './types';
import { toBacklog, toCsv, toHtml, toMarkdown, toTsv } from './format';
import { parseTable } from './parse';

/** 変換 → 取り込みで元の表に戻ることを確かめる。 */
const tricky: TableModel = {
  rows: [
    ['商品名', '単価 (円)', '備考'],
    ['りんご', '120', 'パイプ | を含む'],
    ['みかん', '80', '改行\nを含む'],
    ['ぶどう', '450', ''],
  ],
  hasHeader: true,
  aligns: ['left', 'right', 'default'],
};

describe('往復変換', () => {
  it('Markdown は寄せも含めて往復する', () => {
    const { table } = parseTable(toMarkdown(tricky), 'auto');
    expect(table.rows).toEqual(tricky.rows);
    expect(table.hasHeader).toBe(true);
    expect(table.aligns).toEqual(tricky.aligns);
  });

  it('桁そろえを切った Markdown も往復する', () => {
    const { table } = parseTable(toMarkdown(tricky, { pad: false }), 'auto');
    expect(table.rows).toEqual(tricky.rows);
  });

  it('Backlog 記法（行末 h）が往復する', () => {
    const text = toBacklog(tricky, { pad: true, headerStyle: 'suffix' });
    const { format, table } = parseTable(text, 'auto');
    expect(format).toBe('backlog');
    expect(table.rows).toEqual(tricky.rows);
    expect(table.hasHeader).toBe(true);
  });

  it('Backlog 記法（~ 見出し）が往復する', () => {
    const text = toBacklog(tricky, { pad: false, headerStyle: 'tilde' });
    const { table } = parseTable(text, 'auto');
    expect(table.rows).toEqual(tricky.rows);
    expect(table.hasHeader).toBe(true);
  });

  it('CSV が往復する', () => {
    const { table } = parseTable(toCsv(tricky), 'csv');
    expect(table.rows).toEqual(tricky.rows);
  });

  it('TSV が往復する', () => {
    const { table } = parseTable(toTsv(tricky), 'tsv');
    expect(table.rows).toEqual(tricky.rows);
  });

  it('HTML が往復する', () => {
    const { format, table } = parseTable(toHtml(tricky), 'auto');
    expect(format).toBe('html');
    expect(table.rows).toEqual(tricky.rows);
    expect(table.hasHeader).toBe(true);
  });

  it('見出しなしの表は見出しなしのまま Markdown を往復する', () => {
    const model: TableModel = { rows: [['a', 'b'], ['c', 'd']], hasHeader: false, aligns: [] };
    const { table } = parseTable(toMarkdown(model), 'auto');
    // 見出しなしは空の見出し行として出力されるため、読み戻すと空行が先頭に来る。
    expect(table.rows).toEqual([['', ''], ['a', 'b'], ['c', 'd']]);
  });

  it('Markdown → Backlog の橋渡しでも中身が保たれる', () => {
    const { table } = parseTable(toMarkdown(tricky), 'auto');
    const backlog = toBacklog({ ...table, hasHeader: table.hasHeader });
    const { table: back } = parseTable(backlog, 'auto');
    expect(back.rows).toEqual(tricky.rows);
  });
});
