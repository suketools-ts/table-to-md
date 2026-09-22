import { MENU_CONVERT_TABLE, MENU_EDIT_TABLE, type Command } from './messages';
import HOST_PATTERNS from './hosts.json';

/**
 * 右クリックメニューを組み立てる。
 *
 * `contexts: ['editable']` は入力欄の上でだけ項目を出す。変換の方は入力欄以外の
 * どこでも出したいので、入力欄を除いた文脈を並べている（表のセルの上は 'page'、
 * セル内のリンクや画像の上ではそれぞれ 'link' / 'image' になるため）。
 *
 * `documentUrlPatterns` は必須。メニューはサービスワーカーが全サイト共通で作るので、
 * これを付けないとコンテンツスクリプトが動かないサイトにも項目が出てしまう。
 *
 * どの要素を右クリックしたかはここでは分からないので、実際の処理は
 * コンテンツスクリプト側（右クリックされた要素を控えている）に投げる。
 */
function buildMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_EDIT_TABLE,
      title: 'カーソル位置の表を編集 / 新規作成',
      contexts: ['editable'],
      documentUrlPatterns: HOST_PATTERNS,
    });
    chrome.contextMenus.create({
      id: MENU_CONVERT_TABLE,
      title: 'この表を Markdown / Backlog 記法に変換',
      contexts: ['page', 'selection', 'link', 'image'],
      documentUrlPatterns: HOST_PATTERNS,
    });
  });
}

chrome.runtime.onInstalled.addListener(buildMenus);
chrome.runtime.onStartup.addListener(buildMenus);

const COMMANDS: Record<string, Command> = {
  [MENU_EDIT_TABLE]: { type: 'edit-table' },
  [MENU_CONVERT_TABLE]: { type: 'convert-table' },
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const command = COMMANDS[String(info.menuItemId)];
  if (!command || tab?.id === undefined) return;
  // frameId を渡し、iframe の中で右クリックされた場合もそのフレームに届くようにする。
  chrome.tabs.sendMessage(tab.id, command, { frameId: info.frameId ?? 0 }).catch(() => {
    // コンテンツスクリプトが入っていないページでは届かない。無視してよい。
  });
});
