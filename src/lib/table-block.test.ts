import { describe, expect, it } from 'vitest';
import { findTableBlockAt, padForInsertion } from './table-block';

const doc = ['説明です。', '', '| a | b |h', '| 1 | 2 |', '', 'おわり'].join('\n');

describe('findTableBlockAt', () => {
  it('カーソルのある表の範囲を返す', () => {
    const caret = doc.indexOf('| 1 | 2 |') + 3;
    const block = findTableBlockAt(doc, caret);
    expect(block?.text).toBe('| a | b |h\n| 1 | 2 |');
  });

  it('表の 1 行目からでも範囲全体を取る', () => {
    const block = findTableBlockAt(doc, doc.indexOf('| a | b |h'));
    expect(block?.text).toBe('| a | b |h\n| 1 | 2 |');
  });

  it('行末にカーソルがあってもその行とみなす', () => {
    const caret = doc.indexOf('| a | b |h') + '| a | b |h'.length;
    expect(findTableBlockAt(doc, caret)?.text).toBe('| a | b |h\n| 1 | 2 |');
  });

  it('表の外なら null', () => {
    expect(findTableBlockAt(doc, 0)).toBeNull();
    expect(findTableBlockAt(doc, doc.indexOf('おわり'))).toBeNull();
  });

  it('空行で区切られた 2 つの表を混ぜない', () => {
    const two = ['| a |', '| 1 |', '', '| b |', '| 2 |'].join('\n');
    expect(findTableBlockAt(two, two.indexOf('| b |'))?.text).toBe('| b |\n| 2 |');
    expect(findTableBlockAt(two, 0)?.text).toBe('| a |\n| 1 |');
  });

  it('切り出した範囲は元のテキストと一致する', () => {
    const block = findTableBlockAt(doc, doc.indexOf('| 1 | 2 |'))!;
    expect(doc.slice(block.start, block.end)).toBe(block.text);
  });

  it('CRLF の文書でも改行を巻き込まない', () => {
    const crlf = '前\r\n| a |\r\n| 1 |\r\n後';
    const block = findTableBlockAt(crlf, crlf.indexOf('| a |'));
    expect(block?.text).toBe('| a |\r\n| 1 |');
    expect(crlf.slice(block!.end)).toBe('\r\n後');
  });

  it('文書全体が表でも扱える', () => {
    const only = '| a |\n| 1 |';
    expect(findTableBlockAt(only, only.length)?.text).toBe(only);
  });
});

describe('padForInsertion', () => {
  it('前後の地の文との間に空行を作る', () => {
    expect(padForInsertion('本文', '続き', 'T')).toBe('\n\nT\n\n');
  });

  it('すでに空行があれば足さない', () => {
    expect(padForInsertion('本文\n\n', '\n\n続き', 'T')).toBe('T');
  });

  it('改行が 1 つだけなら 1 つ足す', () => {
    expect(padForInsertion('本文\n', '\n続き', 'T')).toBe('\nT\n');
  });

  it('文書の先頭・末尾では余計な改行を足さない', () => {
    expect(padForInsertion('', '', 'T')).toBe('T');
    expect(padForInsertion('', '続き', 'T')).toBe('T\n\n');
    expect(padForInsertion('本文', '', 'T')).toBe('\n\nT');
  });
});
