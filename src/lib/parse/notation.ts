import type { ParsedTable } from '../types';
import { isMarkdownDelimiterRow, parseMarkdownTable } from './markdown';
import { parseBacklogTable } from './backlog';

/** テキスト欄のソースとして扱う記法。Markdown か Backlog 記法のどちらか。 */
export type Notation = 'markdown' | 'backlog';

/** Backlog 記法にしか現れない目印。 */
const BACKLOG_MARKER = /(\|\s*h\s*$)|(\|\s*~)|(&br;)/im;

/** Markdown の表にしか現れない目印（区切り行）があるか。 */
function hasMarkdownMarker(text: string): boolean {
  return text.split(/\r?\n/).some(isMarkdownDelimiterRow);
}

/**
 * ソーステキストがどちらの記法で書かれているかを判定する。
 *
 * 見出し行の `|h` やセル頭の `~`、セル内改行の `&br;` は Backlog 記法にしか無く、
 * 区切り行（`| --- |`）は Markdown にしか無いので、その有無で見分ける。
 * どちらの目印も無ければ判定できないので `fallback` を返す。
 */
export function detectNotation(text: string, fallback: Notation = 'backlog'): Notation {
  const backlog = BACKLOG_MARKER.test(text);
  const markdown = hasMarkdownMarker(text);
  if (backlog && !markdown) return 'backlog';
  if (markdown && !backlog) return 'markdown';
  return fallback;
}

/** 指定した記法でソーステキストを表に変換する。 */
export function parseNotation(text: string, notation: Notation): ParsedTable {
  return notation === 'backlog' ? parseBacklogTable(text) : parseMarkdownTable(text);
}
