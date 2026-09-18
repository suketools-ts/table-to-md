import { describe, expect, it } from 'vitest';
import { looksLikeHtmlTable, parseHtmlTable } from './html';

describe('parseHtmlTable', () => {
  it('thead の th を見出しとして読む', () => {
    const result = parseHtmlTable(
      '<table><thead><tr><th>Name</th><th>Qty</th></tr></thead>' +
        '<tbody><tr><td>Apple</td><td>10</td></tr></tbody></table>',
    );
    expect(result.hasHeader).toBe(true);
    expect(result.rows).toEqual([
      ['Name', 'Qty'],
      ['Apple', '10'],
    ]);
  });

  it('td だけの表は見出しなしとして読む', () => {
    const result = parseHtmlTable('<table><tr><td>a</td><td>b</td></tr></table>');
    expect(result.hasHeader).toBe(false);
    expect(result.rows).toEqual([['a', 'b']]);
  });

  it('colspan を値の複製で展開する', () => {
    const result = parseHtmlTable(
      '<table><tr><td colspan="2">wide</td><td>c</td></tr><tr><td>1</td><td>2</td><td>3</td></tr></table>',
    );
    expect(result.rows).toEqual([
      ['wide', 'wide', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('rowspan を値の複製で展開する', () => {
    const result = parseHtmlTable(
      '<table><tr><td rowspan="2">tall</td><td>a</td></tr><tr><td>b</td></tr></table>',
    );
    expect(result.rows).toEqual([
      ['tall', 'a'],
      ['tall', 'b'],
    ]);
  });

  it('<br> を改行にして余分な空白を畳む', () => {
    const result = parseHtmlTable('<table><tr><td>  x <br>  y  </td></tr></table>');
    expect(result.rows).toEqual([['x\ny']]);
  });

  it('入れ子のタグは取り除いて文字だけ残す', () => {
    const result = parseHtmlTable(
      '<table><tr><td><a href="#"><b>link</b></a></td></tr></table>',
    );
    expect(result.rows).toEqual([['link']]);
  });

  it('表が無ければ空を返す', () => {
    expect(parseHtmlTable('<p>no table</p>').rows).toEqual([]);
  });

  it('table タグの有無を判定できる', () => {
    expect(looksLikeHtmlTable('<table><tr><td>a</td></tr></table>')).toBe(true);
    expect(looksLikeHtmlTable('a,b')).toBe(false);
  });
});
