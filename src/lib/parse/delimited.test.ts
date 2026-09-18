import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseDelimited } from './delimited';

describe('parseDelimited', () => {
  it('単純な CSV を読む', () => {
    expect(parseDelimited('a,b\nc,d', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('クォート内の区切り・改行・二重引用符を解く', () => {
    expect(parseDelimited('"a,b","say ""hi""","x\ny"', ',')).toEqual([
      ['a,b', 'say "hi"', 'x\ny'],
    ]);
  });

  it('CRLF を改行として扱う', () => {
    expect(parseDelimited('a,b\r\nc,d\r\n', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('末尾の改行 1 つでは空行を作らない', () => {
    expect(parseDelimited('a\tb\n', '\t')).toEqual([['a', 'b']]);
  });

  it('空セルを保つ', () => {
    expect(parseDelimited('a,,c', ',')).toEqual([['a', '', 'c']]);
  });

  it('空文字は 1x1 の空表になる', () => {
    expect(parseDelimited('', ',')).toEqual([['']]);
  });
});

describe('detectDelimiter', () => {
  it('タブ区切りを見分ける', () => {
    expect(detectDelimiter('a\tb\tc\nd\te\tf')).toBe('\t');
  });

  it('カンマ区切りを見分ける', () => {
    expect(detectDelimiter('a,b,c\nd,e,f')).toBe(',');
  });

  it('セミコロン区切りを見分ける', () => {
    expect(detectDelimiter('a;b;c\nd;e;f')).toBe(';');
  });

  it('カンマを含むタブ区切り（Excel の貼り付け）はタブを選ぶ', () => {
    expect(detectDelimiter('名前\t金額\n田中\t1,000\n鈴木\t2,500')).toBe('\t');
  });
});
