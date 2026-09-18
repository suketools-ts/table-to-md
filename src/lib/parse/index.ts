import type { InputFormat, ParsedTable } from '../types';
import { detectDelimiter, parseDelimitedTable } from './delimited';
import { looksLikeHtmlTable, parseHtmlTable } from './html';
import { looksLikeMarkdownTable, parseMarkdownTable } from './markdown';
import { looksLikeBacklogTable, parseBacklogTable } from './backlog';

export * from './delimited';
export * from './html';
export * from './markdown';
export * from './backlog';
export * from './notation';

/** `auto` 指定時に使われる形式判定。判定順は誤検出が少ない順。 */
export function detectFormat(text: string): Exclude<InputFormat, 'auto'> {
  if (looksLikeHtmlTable(text)) return 'html';
  if (looksLikeBacklogTable(text)) return 'backlog';
  if (looksLikeMarkdownTable(text)) return 'markdown';
  return detectDelimiter(text) === '\t' ? 'tsv' : 'csv';
}

/** 指定（または自動判定）した形式でテキストを表に変換する。 */
export function parseTable(text: string, format: InputFormat): {
  table: ParsedTable;
  format: Exclude<InputFormat, 'auto'>;
} {
  const resolved = format === 'auto' ? detectFormat(text) : format;
  switch (resolved) {
    case 'html':
      return { table: parseHtmlTable(text), format: resolved };
    case 'markdown':
      return { table: parseMarkdownTable(text), format: resolved };
    case 'backlog':
      return { table: parseBacklogTable(text), format: resolved };
    case 'tsv':
      return { table: parseDelimitedTable(text, '\t'), format: resolved };
    case 'csv':
    default:
      return { table: parseDelimitedTable(text, detectDelimiter(text)), format: 'csv' };
  }
}
