import type { TableModel } from '../types';
import { columnCount, fitAligns, normalizeRows } from '../types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 表を HTML の `<table>` に変換する。
 * クリップボードへ `text/html` として書き込むことで、スプレッドシートや
 * リッチテキストエディタに表のまま貼り付けられるようにする用途。
 */
export function toHtml(model: TableModel): string {
  const rows = normalizeRows(model.rows);
  const count = columnCount(rows);
  const aligns = fitAligns(model.aligns, count);

  const cell = (value: string, tag: 'td' | 'th', col: number) => {
    const align = aligns[col];
    const style = align === 'default' ? '' : ` style="text-align:${align}"`;
    return `<${tag}${style}>${escapeHtml(value).replace(/\r\n|\r|\n/g, '<br>')}</${tag}>`;
  };

  const lines: string[] = ['<table>'];
  if (model.hasHeader && rows.length > 0) {
    lines.push('<thead>');
    lines.push(`<tr>${rows[0].map((v, col) => cell(v, 'th', col)).join('')}</tr>`);
    lines.push('</thead>');
  }
  const body = model.hasHeader ? rows.slice(1) : rows;
  lines.push('<tbody>');
  for (const row of body) {
    lines.push(`<tr>${row.map((v, col) => cell(v, 'td', col)).join('')}</tr>`);
  }
  lines.push('</tbody>');
  lines.push('</table>');
  return lines.join('\n');
}
