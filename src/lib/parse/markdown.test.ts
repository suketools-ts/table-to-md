import { describe, expect, it } from 'vitest';
import { looksLikeMarkdownTable, parseMarkdownTable, splitPipeRow } from './markdown';

describe('splitPipeRow', () => {
  it('前後の境界パイプを落とす', () => {
    expect(splitPipeRow('| a | b |')).toEqual(['a', 'b']);
  });

  it('境界パイプが無くても読む', () => {
    expect(splitPipeRow('a | b')).toEqual(['a', 'b']);
  });

  it('エスケープされたパイプは区切りにしない', () => {
    expect(splitPipeRow('| a\\|b | c |')).toEqual(['a|b', 'c']);
  });

  it('エスケープされた円記号を戻す', () => {
    expect(splitPipeRow('| a\\\\b |')).toEqual(['a\\b']);
  });

  it('空セルを保つ', () => {
    expect(splitPipeRow('| a |  | c |')).toEqual(['a', '', 'c']);
  });
});

describe('parseMarkdownTable', () => {
  it('見出しと寄せを読み取る', () => {
    const result = parseMarkdownTable(
      ['| Name | Qty |', '| :--- | ---: |', '| Apple | 10 |'].join('\n'),
    );
    expect(result.rows).toEqual([
      ['Name', 'Qty'],
      ['Apple', '10'],
    ]);
    expect(result.hasHeader).toBe(true);
    expect(result.aligns).toEqual(['left', 'right']);
  });

  it('中央寄せを読み取る', () => {
    const result = parseMarkdownTable(['| a |', '| :-: |', '| 1 |'].join('\n'));
    expect(result.aligns).toEqual(['center']);
  });

  it('<br> を改行に戻す', () => {
    const result = parseMarkdownTable(['| a |', '| --- |', '| x<br>y |'].join('\n'));
    expect(result.rows[1]).toEqual(['x\ny']);
  });

  it('区切り行が無いときは見出しなしとして読む', () => {
    const result = parseMarkdownTable(['| a | b |', '| c | d |'].join('\n'));
    expect(result.hasHeader).toBe(false);
    expect(result.rows).toHaveLength(2);
  });

  it('区切り行を含む表だけを表と見なす', () => {
    expect(looksLikeMarkdownTable('| a |\n| --- |\n| 1 |')).toBe(true);
    expect(looksLikeMarkdownTable('a,b\nc,d')).toBe(false);
  });
});
