import {
  MENU_COPY_BACKLOG,
  MENU_COPY_MARKDOWN,
  MENU_EDIT_TABLE,
  type Command,
} from './messages';

/**
 * 右クリックメニューを組み立てる。
 *
 * `contexts: ['editable']` は入力欄の上でだけ、`['selection']` は範囲選択中だけ
 * 項目を出す。どの要素を右クリックしたかはここでは分からないので、実際の処理は
 * コンテンツスクリプト側（右クリックされた要素を控えている）に投げる。
 */
function buildMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_EDIT_TABLE,
      title: 'カーソル位置の表を編集 / 新規作成',
      contexts: ['editable'],
    });
    chrome.contextMenus.create({
      id: MENU_COPY_MARKDOWN,
      title: '選択した表を Markdown でコピー',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: MENU_COPY_BACKLOG,
      title: '選択した表を Backlog 記法でコピー',
      contexts: ['selection'],
    });
  });
}

chrome.runtime.onInstalled.addListener(buildMenus);
chrome.runtime.onStartup.addListener(buildMenus);

const COMMANDS: Record<string, Command> = {
  [MENU_EDIT_TABLE]: { type: 'edit-table' },
  [MENU_COPY_MARKDOWN]: { type: 'copy-table', notation: 'markdown' },
  [MENU_COPY_BACKLOG]: { type: 'copy-table', notation: 'backlog' },
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const command = COMMANDS[String(info.menuItemId)];
  if (!command || tab?.id === undefined) return;
  // frameId を渡し、iframe の中で右クリックされた場合もそのフレームに届くようにする。
  chrome.tabs.sendMessage(tab.id, command, { frameId: info.frameId ?? 0 }).catch(() => {
    // コンテンツスクリプトが入っていないページでは届かない。無視してよい。
  });
});
