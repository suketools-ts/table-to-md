import { describe, expect, it } from 'vitest';
import { toCsv, toTsv } from './delimited';
import type { TableModel } from '../types';

describe('toCsv / toTsv', () => {
  it('区切り・引用符・改行を含むセルをクォートする', () => {
    const model: TableModel = {
      rows: [
        ['a,b', 'say "hi"', 'x\ny'],
        ['plain', '', '1'],
      ],
      hasHeader: true,
      aligns: [],
    };
    expect(toCsv(model)).toBe(['"a,b","say ""hi""","x\ny"', 'plain,,1'].join('\n'));
  });

  it('TSV ではカンマをクォートしない', () => {
    const model: TableModel = { rows: [['a,b', 'c']], hasHeader: false, aligns: [] };
    expect(toTsv(model)).toBe('a,b\tc');
  });
});
