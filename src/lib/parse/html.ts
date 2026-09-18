import type { ParsedTable } from '../types';

/** 文字列に `<table>` らしきものが含まれるか。 */
export function looksLikeHtmlTable(text: string): boolean {
  return /<table[\s>]/i.test(text);
}

/**
 * `<td>` / `<th>` の中身をセル文字列にする。
 * `<br>` は改行に、それ以外のタグは取り除き、連続する空白は 1 つに畳む
 * （ブラウザの表示に近い見た目を再現するため）。
 */
function cellText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  // ブロック要素は改行として扱う。
  clone.querySelectorAll('p, div, li, tr').forEach((block) => {
    block.append('\n');
  });
  const raw = clone.textContent ?? '';
  return raw
    .split('\n')
    .map((line) => line.replace(/[\t\f\r ]+/g, ' ').replace(/ /g, ' ').trim())
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/^\n+|\n+$/g, '');
}

interface Occupancy {
  /** 行 -> 列 -> 埋まっているか */
  grid: boolean[][];
}

function isOccupied(o: Occupancy, row: number, col: number): boolean {
  return o.grid[row]?.[col] === true;
}

function occupy(o: Occupancy, row: number, col: number): void {
  if (!o.grid[row]) o.grid[row] = [];
  o.grid[row][col] = true;
}

/**
 * HTML の表を 2 次元配列に展開する。
 * `colspan` / `rowspan` は結合元の値を複製して埋める（Markdown や Backlog 記法は
 * セル結合を表現できないため、欠損させるより複製した方が編集しやすい）。
 */
export function parseHtmlTable(html: string): ParsedTable {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return { rows: [], hasHeader: true, aligns: [] };

  const trs = Array.from(table.querySelectorAll('tr'));
  const rows: string[][] = [];
  const occ: Occupancy = { grid: [] };
  const headerFlags: boolean[] = [];

  trs.forEach((tr, rowIndex) => {
    if (!rows[rowIndex]) rows[rowIndex] = [];
    const cells = Array.from(tr.children).filter(
      (el) => el.tagName === 'TD' || el.tagName === 'TH',
    );
    let allHeader = cells.length > 0;
    let col = 0;

    for (const cell of cells) {
      while (isOccupied(occ, rowIndex, col)) col += 1;

      const colSpan = Math.max(1, Number(cell.getAttribute('colspan') ?? 1) || 1);
      const rowSpan = Math.max(1, Number(cell.getAttribute('rowspan') ?? 1) || 1);
      const value = cellText(cell);
      if (cell.tagName !== 'TH') allHeader = false;

      for (let r = 0; r < rowSpan; r += 1) {
        const target = rowIndex + r;
        if (!rows[target]) rows[target] = [];
        for (let c = 0; c < colSpan; c += 1) {
          while (rows[target].length < col + c) rows[target].push('');
          rows[target][col + c] = value;
          occupy(occ, target, col + c);
        }
      }
      col += colSpan;
    }

    headerFlags[rowIndex] = allHeader;
  });

  // rowspan で先に埋めた行が trs より多いことはないが、穴は空文字で埋める。
  const filled = rows.map((row) => Array.from(row, (cell) => cell ?? ''));
  const hasHeader = headerFlags[0] === true || table.querySelector('thead th') !== null;

  return { rows: filled, hasHeader, aligns: [] };
}
