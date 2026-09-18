import { describe, expect, it } from 'vitest';
import { toBacklog } from './backlog';
import type { TableModel } from '../types';

const base: TableModel = {
  rows: [
    ['Name', 'Qty'],
    ['Apple', '10'],
  ],
  hasHeader: true,
  aligns: [],
};

describe('toBacklog', () => {
  it('見出し行の末尾に h を付ける', () => {
    expect(toBacklog(base)).toBe(['| Name  | Qty |h', '| Apple | 10  |'].join('\n'));
  });

  it('~ 記法の見出しも選べる', () => {
    expect(toBacklog(base, { pad: false, headerStyle: 'tilde' })).toBe(
      ['| ~Name | ~Qty |', '| Apple | 10 |'].join('\n'),
    );
  });

  it('見出しなしなら h も ~ も付かない', () => {
    expect(toBacklog({ ...base, hasHeader: false }, { pad: false, headerStyle: 'suffix' })).toBe(
      ['| Name | Qty |', '| Apple | 10 |'].join('\n'),
    );
  });

  it('パイプは文字参照に、改行は &br; にする', () => {
    const model: TableModel = { rows: [['a|b', 'c\nd']], hasHeader: false, aligns: [] };
    expect(toBacklog(model, { pad: false, headerStyle: 'suffix' })).toBe(
      '| a&#124;b | c&br;d |',
    );
  });
});
