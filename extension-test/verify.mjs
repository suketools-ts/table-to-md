/**
 * 拡張機能を実ブラウザで通しで確認する。
 *
 * 表の変換ロジックは vitest で押さえているが、入力欄への書き戻しだけは
 * ブラウザとエディタの実装に強く依存するので、ここで実際に動かして確かめる。
 * とくに Backlog のコメント欄は ProseMirror なので、本物の ProseMirror を立てている。
 *
 *   npm run build:extension && npm run build:fixtures
 *   node extension-test/verify.mjs
 *
 * Chromium の場所は PLAYWRIGHT_CHROMIUM_PATH で指定できる（未指定なら Playwright の既定）。
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

// 静的サーバーを自前で立てる。ES モジュールは file:// から読めないため。
const server = createServer(async (req, res) => {
  const path = join(root, normalize(decodeURIComponent((req.url ?? '/').split('?')[0])));
  if (!path.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(path);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const failures = [];
const check = (label, actual, expected) => {
  const ok = actual === expected;
  console.log(`${ok ? '  OK ' : '  NG '} ${label}`);
  if (!ok) {
    failures.push(label);
    console.log(`       期待: ${JSON.stringify(expected)}`);
    console.log(`       実際: ${JSON.stringify(actual)}`);
  }
};

/**
 * いまフォーカスがどこにあるかを一言で返す。
 * シャドウ DOM の中に居る間、document.activeElement はホスト要素を指すので、
 * そこから shadowRoot.activeElement をたどる。
 */
const focusPlace = () =>
  page.evaluate(() => {
    const host = document.getElementById('table-to-md-overlay-host');
    const active = document.activeElement;
    if (host && active === host) {
      const inner = host.shadowRoot.activeElement;
      if (!inner) return 'オーバーレイ（フォーカス要素なし）';
      if (inner.classList.contains('masume-grid-editor')) return 'グリッド';
      if (inner.classList.contains('tt-source')) return 'ソース欄';
      if (inner.classList.contains('tt-root')) return 'ダイアログの枠';
      return `ダイアログ内: ${inner.className}`;
    }
    if (!active || active === document.body) return 'ページ（body）';
    return active.id ? `#${active.id}` : active.tagName.toLowerCase();
  });

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
    : {},
);
const ctx = await browser.newContext({ viewport: { width: 1180, height: 900 } });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
const page = await ctx.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

const shadow = () => page.locator('#table-to-md-overlay-host').locator('.tt-root');

/** ProseMirror の指定した段落の指定位置にカーソルを置き、右クリックを起こす。 */
const caretInParagraph = (index, offset) =>
  page.evaluate(
    ([index, offset]) => {
      const host = document.querySelector('#leftCommentContent');
      const p = host.querySelectorAll('p')[index];
      const range = document.createRange();
      range.setStart(p.firstChild ?? p, offset);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      host.focus();
      p.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    },
    [index, offset],
  );

console.log('\n[ProseMirror] 表の読み取りと書き戻し');
await page.goto(`${base}/extension-test/prosemirror.html`);
await page.locator('#leftCommentContent').waitFor();
await caretInParagraph(3, 3);
await page.evaluate(() => window.__send({ type: 'edit-table' }));
await shadow().waitFor({ timeout: 10000 });
check('記法を Backlog 記法と判定する', await shadow().locator('.tt-note').innerText(), '自動判定: Backlog 記法');
check(
  '段落ごとに 1 行として読む',
  (await shadow().locator('.masume-grid-cell').allInnerTexts()).slice(0, 3).join(','),
  'header1,header2,header3',
);
const target = shadow().locator('.masume-grid-cell').filter({ hasText: 'header2' }).first();
await target.dblclick();
await page.waitForTimeout(150);
await page.keyboard.press('ControlOrMeta+a');
await page.keyboard.type('状態', { delay: 40 });
await page.keyboard.press('Enter');
await shadow().getByRole('button', { name: 'この内容で置き換える' }).click();
await page.waitForTimeout(500);
check(
  '元の表だけを置き換える',
  await page.evaluate(() => window.__pmText()),
  ['テスト文書', '', '| header1 | 状態 | header3 |h', '| col1    | col2 | col3    |', '| col1    | col2 | col3    |'].join('\n'),
);

console.log('\n[ProseMirror] 新規挿入');
await page.goto(`${base}/extension-test/prosemirror.html`);
await page.locator('#leftCommentContent').waitFor();
await caretInParagraph(0, 5);
await page.evaluate(() => window.__send({ type: 'edit-table' }));
await shadow().waitFor();
check('新規作成として開く', await shadow().locator('.tt-modal__title').innerText(), '表を挿入');
await shadow().getByRole('button', { name: 'カーソル位置に挿入' }).click();
await page.waitForTimeout(500);
check(
  '前後を空行で挟んで挿入する',
  (await page.evaluate(() => window.__pmText())).split('\n').slice(0, 3).join(' / '),
  'テスト文書 /  / |  |  |  |h',
);

console.log('\n[ProseMirror] 空のコメント欄に挿入');
await page.goto(`${base}/extension-test/prosemirror.html`);
await page.locator('#leftCommentContent').waitFor();
// Backlog でコメント欄が空のときと同じ形。段落がひとつあるだけでテキストノードが無い。
await page.evaluate(() => window.__pmSetLines(['']));
check(
  'テキストノードを持たない状態にする',
  await page.evaluate(() => document.querySelector('#leftCommentContent').textContent),
  '',
);
await caretInParagraph(0, 0);
await page.evaluate(() => window.__send({ type: 'edit-table' }));
await shadow().waitFor();
check('新規作成として開く', await shadow().locator('.tt-modal__title').innerText(), '表を挿入');
await shadow().getByRole('button', { name: 'カーソル位置に挿入' }).click();
await page.waitForTimeout(500);
check(
  '空のコメント欄にも挿入できる',
  await page.evaluate(() => window.__pmText()),
  ['|  |  |  |h', '|  |  |  |', '|  |  |  |'].join('\n'),
);

console.log('\n[ProseMirror] 記法の切り替え');
await page.goto(`${base}/extension-test/prosemirror.html`);
await page.locator('#leftCommentContent').waitFor();
await caretInParagraph(2, 1);
await page.evaluate(() => window.__send({ type: 'edit-table' }));
await shadow().waitFor();
await shadow().locator('select').selectOption('markdown');
await shadow().getByRole('button', { name: 'この内容で置き換える' }).click();
await page.waitForTimeout(500);
check(
  'Markdown に変換し桁そろえを保つ',
  (await page.evaluate(() => window.__pmText())).split('\n').slice(2, 4).join('\n'),
  '| header1 | header2 | header3 |\n| ------- | ------- | ------- |',
);

console.log('\n[textarea] 表の編集');
await page.goto(`${base}/extension-test/fixture.html`);
await page.locator('#src').waitFor();
await page.evaluate(() => {
  const el = document.getElementById('src');
  el.focus();
  const caret = el.value.indexOf('| みかん') + 3;
  el.setSelectionRange(caret, caret);
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
});
await page.evaluate(() => window.__send({ type: 'edit-table' }));
await shadow().waitFor();
const cell = shadow().locator('.masume-grid-cell').filter({ hasText: 'りんご' }).first();
await cell.dblclick();
// セルの入力欄が開くのを待ってから全選択する。開く前に押すと既存の文字に追記されてしまう。
await page.waitForTimeout(150);
await page.keyboard.press('ControlOrMeta+a');
await page.keyboard.type('いちご', { delay: 40 });
await page.keyboard.press('Enter');
await shadow().getByRole('button', { name: 'この内容で置き換える' }).click();
await page.waitForTimeout(400);
check(
  '表の範囲だけを置き換える',
  await page.locator('#src').inputValue(),
  ['説明文です。', '', '| 商品名 | 単価 | 在庫 |h', '| いちご | 120  | 30   |', '| みかん | 80   | 120  |', '', '以上です。'].join('\n'),
);

console.log('\n[contenteditable] 空の入力欄に挿入');
await page.goto(`${base}/extension-test/fixture.html`);
await page.locator('#rich').waitFor();
await page.evaluate(() => {
  const el = document.getElementById('rich');
  el.innerHTML = '';
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
});
await page.evaluate(() => window.__send({ type: 'edit-table' }));
await shadow().waitFor();
check('新規作成として開く', await shadow().locator('.tt-modal__title').innerText(), '表を挿入');
await shadow().getByRole('button', { name: 'カーソル位置に挿入' }).click();
await page.waitForTimeout(400);
// 素の contenteditable では 1 行目が素のテキスト、2 行目以降が <div> になる。
// textContent では改行が消えるので、見た目の行で確かめる。
check(
  '空の contenteditable にも挿入できる',
  await page.evaluate(() => document.getElementById('rich').innerText.trim()),
  ['|  |  |  |h', '|  |  |  |', '|  |  |  |'].join('\n'),
);

console.log('\n[記法の既定] 判断できないときは Backlog 記法');
/** #src を指定の中身にして、末尾にカーソルを置いた状態で編集画面を開く。 */
const openEditorOn = async (value) => {
  await page.evaluate((value) => {
    const el = document.getElementById('src');
    el.value = value;
    el.focus();
    el.setSelectionRange(value.length, value.length);
    el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
  }, value);
  await page.evaluate(() => window.__send({ type: 'edit-table' }));
  await shadow().waitFor();
};

await page.goto(`${base}/extension-test/fixture.html`);
await page.locator('#src').waitFor();
// 目印（|h・~・&br;・区切り行）がどこにも無い表。どちらの記法とも取れる。
await openEditorOn('| 商品名 | 単価 |\n| いちご | 120 |');
check('目印の無い表は Backlog 記法と判定する', await shadow().locator('.tt-note').innerText(), '自動判定: Backlog 記法');
check('記法の選択も Backlog 記法になる', await shadow().locator('select').inputValue(), 'backlog');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

await openEditorOn('');
check('空の入力欄では既定値と伝える', await shadow().locator('.tt-note').innerText(), '判定材料が無いため既定値です');
check('空の入力欄でも Backlog 記法を選ぶ', await shadow().locator('select').inputValue(), 'backlog');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

console.log('\n[フォーカス] ダイアログとページの行き来');
await page.goto(`${base}/extension-test/fixture.html`);
await page.locator('#src').waitFor();
await page.evaluate(() => {
  const el = document.getElementById('src');
  el.focus();
  const caret = el.value.indexOf('| みかん') + 3;
  el.setSelectionRange(caret, caret);
  el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
});
check('開く前はページの入力欄にある', await focusPlace(), '#src');
await page.evaluate(() => window.__send({ type: 'edit-table' }));
await shadow().waitFor();
check('開くとダイアログへ移る', await focusPlace(), 'グリッド');
// クリックせずにそのまま打てるか。フォーカスが移っていなければ後ろの入力欄が汚れる。
await page.keyboard.type('果物', { delay: 40 });
await page.keyboard.press('Enter');
check(
  'クリックせずにセルへ入力できる',
  await shadow().locator('.masume-grid-cell').first().innerText(),
  '果物',
);
check('打鍵が後ろの入力欄に漏れない', (await page.locator('#src').inputValue()).includes('果物'), false);
// セル編集中の Esc は入力の取り消しに使う。ここでダイアログまで閉じてはいけない。
await shadow().locator('.masume-grid-cell').nth(1).dblclick();
await page.waitForTimeout(150);
await page.keyboard.type('取り消す', { delay: 30 });
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check('セル編集中の Esc では閉じない', await shadow().count(), 1);
check(
  'セル編集中の Esc は入力を取り消す',
  await shadow().locator('.masume-grid-cell').nth(1).innerText(),
  '単価',
);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check('閉じるとページの入力欄に戻る', await focusPlace(), '#src');

console.log('\n[表示中の表] 右クリックからソースに変換');
/** 選択せずに、指定した要素の上で右クリックしたことにする。 */
const rightClickOn = (selector) =>
  page.evaluate((selector) => {
    window.getSelection().removeAllRanges();
    document.querySelector(selector).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
  }, selector);

// Backlog コメントの表。セルの上で右クリックする。
await rightClickOn('#issueDescription td');
await page.evaluate(() => window.__send({ type: 'convert-table' }));
await shadow().waitFor({ timeout: 10000 });
check('変換ダイアログを開く', await shadow().locator('.tt-modal__title').innerText(), '表をソースに変換');
check('ソース欄にフォーカスが移る', await focusPlace(), 'ソース欄');
// 枠の内側の右端と、ソース欄の右端のずれ。box-sizing が content-box だと
// padding と border のぶんだけはみ出す。
check(
  'ソース欄が枠からはみ出さない',
  await page.evaluate(() => {
    const shadowRoot = document.getElementById('table-to-md-overlay-host').shadowRoot;
    const modal = shadowRoot.querySelector('.tt-modal').getBoundingClientRect();
    const source = shadowRoot.querySelector('.tt-source').getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(shadowRoot.querySelector('.tt-modal')).paddingRight);
    return Math.round(source.right - (modal.right - pad));
  }),
  0,
);
check(
  'タブは Backlog 記法 / Markdown の順に並ぶ',
  (await shadow().getByRole('tab').allInnerTexts()).join(' / '),
  'Backlog 記法 / Markdown',
);
check(
  '既定で Backlog 記法を表示する',
  (await shadow().locator('.tt-source').inputValue()).split('\n')[0],
  '| No | 種別 | 要求事項                                                   |h',
);
await shadow().getByRole('tab', { name: 'Markdown' }).click();
check(
  'Markdown に切り替えられる',
  (await shadow().locator('.tt-source').inputValue()).split('\n').slice(0, 2).join('\n'),
  ['| No  | 種別 | 要求事項                                                   |',
   '| --- | ---- | ---------------------------------------------------------- |'].join('\n'),
);
await shadow().getByRole('button', { name: 'コピー' }).click();
await page.waitForTimeout(400);
check(
  'ダイアログからコピーできる',
  (await page.evaluate(() => navigator.clipboard.readText())).split('\n').slice(0, 2).join('\n'),
  ['| No  | 種別 | 要求事項                                                   |',
   '| --- | ---- | ---------------------------------------------------------- |'].join('\n'),
);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// 表の外（同じコメント内の段落）で右クリックしても、そのコメントの表を拾う。
await rightClickOn('#mockup');
await page.evaluate(() => window.__send({ type: 'convert-table' }));
await shadow().waitFor();
check(
  '表の外で右クリックしても同じコメントの表を拾う',
  (await shadow().locator('.tt-source').inputValue()).split('\n')[0],
  '| No | 種別 | 要求事項                                                   |h',
);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// rowspan のある表。
await rightClickOn('#rendered td');
await page.evaluate(() => window.__send({ type: 'convert-table' }));
await shadow().waitFor();
await shadow().getByRole('tab', { name: 'Backlog 記法' }).click();
check(
  'rowspan を展開する',
  await shadow().locator('.tt-source').inputValue(),
  ['| 担当 | 状態   | 期限       |h', '| 田中 | 処理中 | 2026-10-01 |', '| 鈴木 | 未対応 | 2026-10-05 |', '| 鈴木 | 完了   | 2026-09-30 |'].join('\n'),
);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// 表が無いところ。
await rightClickOn('h1');
await page.evaluate(() => window.__send({ type: 'convert-table' }));
await page.waitForTimeout(300);
check(
  '表が無ければそう伝える',
  await page.locator('#table-to-md-overlay-host').locator('.tt-toast').innerText(),
  'この辺りに表が見つかりませんでした。',
);

await browser.close();
server.close();

if (problems.length > 0) {
  console.log('\nページ内のエラー:');
  problems.forEach((p) => console.log(`  ${p}`));
}
console.log(failures.length === 0 ? '\nすべて期待どおりです。' : `\n${failures.length} 件が期待と違います。`);
process.exit(failures.length === 0 && problems.length === 0 ? 0 : 1);
