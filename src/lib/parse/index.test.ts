import { describe, expect, it } from 'vitest';
import { detectFormat, parseTable } from './index';

describe('detectFormat', () => {
  it.each([
    ['<table><tr><td>a</td></tr></table>', 'html'],
    ['| a | b |h\n| 1 | 2 |', 'backlog'],
    ['| a | b |\n| --- | --- |\n| 1 | 2 |', 'markdown'],
    ['a\tb\nc\td', 'tsv'],
    ['a,b\nc,d', 'csv'],
  ])('%s を %s と判定する', (input, expected) => {
    expect(detectFormat(input)).toBe(expected);
  });
});

describe('parseTable', () => {
  it('形式を明示すると自動判定より優先する', () => {
    // Markdown に見えるテキストを CSV として読むと 1 列のままになる。
    const { format, table } = parseTable('| a | b |\n| --- | --- |', 'csv');
    expect(format).toBe('csv');
    expect(table.rows[0]).toEqual(['| a | b |']);
  });

  it('自動判定なら Markdown として読む', () => {
    const { format, table } = parseTable('| a | b |\n| --- | --- |\n| 1 | 2 |', 'auto');
    expect(format).toBe('markdown');
    expect(table.rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});
