import { describe, expect, it } from 'vitest';
import { serialize } from './editable';

/** HTML 文字列を実要素にして serialize にかける。 */
function read(html: string): string {
  const host = document.createElement('div');
  host.innerHTML = html;
  return serialize(host).text;
}

describe('serialize', () => {
  it('ブロック要素 1 つを 1 行として読む', () => {
    // Backlog のコメント欄（ProseMirror）は 1 行を 1 つの <p> で表す。
    expect(read('<p>あ</p><p>い</p>')).toBe('あ\nい');
  });

  it('空段落を空行として残す', () => {
    // 空段落は表と地の文の区切りになるので、潰してはいけない。
    expect(read('<p>あ</p><p><br class="ProseMirror-trailingBreak"></p><p>い</p>')).toBe('あ\n\nい');
  });

  it('innerText と違い段落ごとに改行を増やさない', () => {
    const html = '<p>テスト文書</p><p><br></p><p>|a|b|h</p><p>|1|2|</p>';
    expect(read(html)).toBe('テスト文書\n\n|a|b|h\n|1|2|');
  });

  it('段落の途中の <br> は改行として数える', () => {
    expect(read('<p>あ<br>い</p>')).toBe('あ\nい');
  });

  it('段落末尾の <br> は改行として数えない', () => {
    // 空段落を保つための置き場所であって、行の区切りではない。
    expect(read('<p>あ<br></p><p>い</p>')).toBe('あ\nい');
  });

  it('インライン要素は行を分けない', () => {
    expect(read('<p>あ<strong>い</strong><em>う</em></p>')).toBe('あいう');
  });

  it('リストの項目はそれぞれ 1 行になる', () => {
    expect(read('<ul><li>あ</li><li>い</li></ul>')).toBe('あ\nい');
  });

  it('ブロック要素が無ければそのまま 1 行として読む', () => {
    expect(read('ただのテキスト')).toBe('ただのテキスト');
  });

  it('空の入力は空文字', () => {
    expect(read('')).toBe('');
  });

  it('桁そろえの空白を保つ', () => {
    expect(read('<p>| a    | bb |h</p>')).toBe('| a    | bb |h');
  });

  it('テキストノードの位置が文字位置と対応する', () => {
    const host = document.createElement('div');
    host.innerHTML = '<p>あい</p><p>うえ</p>';
    const { text, pieces } = serialize(host);
    expect(text).toBe('あい\nうえ');
    expect(pieces).toHaveLength(2);
    expect(pieces[0]).toMatchObject({ start: 0, end: 2 });
    // 2 つ目の段落は区切りの改行を挟んだ 3 文字目から始まる。
    expect(pieces[1]).toMatchObject({ start: 3, end: 5 });
    expect(text.slice(pieces[1].start, pieces[1].end)).toBe('うえ');
  });
});
