import { describe, expect, it } from 'vitest';
import { looksLikeBacklogTable, parseBacklogTable } from './backlog';

describe('parseBacklogTable', () => {
  it('行末の h を見出し行として読む', () => {
    const result = parseBacklogTable(['| Name | Qty |h', '| Apple | 10 |'].join('\n'));
    expect(result.hasHeader).toBe(true);
    expect(result.rows).toEqual([
      ['Name', 'Qty'],
      ['Apple', '10'],
    ]);
  });

  it('セル頭の ~ を見出しセルとして読む', () => {
    const result = parseBacklogTable(['|~Name|~Qty|', '|Apple|10|'].join('\n'));
    expect(result.hasHeader).toBe(true);
    expect(result.rows[0]).toEqual(['Name', 'Qty']);
  });

  it('&br; を改行に、&#124; をパイプに戻す', () => {
    const result = parseBacklogTable('| a&br;b | c&#124;d |');
    expect(result.rows[0]).toEqual(['a\nb', 'c|d']);
  });

  it('見出しの無い表も読める', () => {
    const result = parseBacklogTable(['| a | b |', '| c | d |'].join('\n'));
    expect(result.hasHeader).toBe(false);
    expect(result.rows).toHaveLength(2);
  });

  it('h や ~ が無いものは Backlog 記法と判定しない', () => {
    expect(looksLikeBacklogTable('| a | b |\n| c | d |')).toBe(false);
    expect(looksLikeBacklogTable('| a | b |h')).toBe(true);
  });
});
