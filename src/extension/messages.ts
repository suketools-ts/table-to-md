/** バックグラウンド（サービスワーカー）からコンテンツスクリプトへ送る指示。 */
export type Command =
  /** カーソル位置の表を編集する。表が無ければ新規作成として開く。 */
  | { type: 'edit-table' }
  /** 右クリックした位置（または選択範囲）の表をソースに変換して見せる。 */
  | { type: 'convert-table' };

export const MENU_EDIT_TABLE = 'edit-table';
export const MENU_CONVERT_TABLE = 'convert-table';
