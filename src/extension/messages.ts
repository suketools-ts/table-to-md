import type { Notation } from '../lib/parse/notation';

/** バックグラウンド（サービスワーカー）からコンテンツスクリプトへ送る指示。 */
export type Command =
  /** カーソル位置の表を編集する。表が無ければ新規作成として開く。 */
  | { type: 'edit-table' }
  /** 選択範囲の表をソースに変換してクリップボードへ入れる。 */
  | { type: 'copy-table'; notation: Notation };

export const MENU_EDIT_TABLE = 'edit-table';
export const MENU_COPY_MARKDOWN = 'copy-markdown';
export const MENU_COPY_BACKLOG = 'copy-backlog';
