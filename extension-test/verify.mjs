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
await page.keyboard.press('Control+a');
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
await page.keyboard.press('Control+a');
await page.keyboard.type('いちご', { delay: 40 });
await page.keyboard.press('Enter');
await shadow().getByRole('button', { name: 'この内容で置き換える' }).click();
await page.waitForTimeout(400);
check(
  '表の範囲だけを置き換える',
  await page.locator('#src').inputValue(),
  ['説明文です。', '', '| 商品名 | 単価 | 在庫 |h', '| いちご | 120  | 30   |', '| みかん | 80   | 120  |', '', '以上です。'].join('\n'),
);

console.log('\n[選択範囲] 表示中の表をコピー');
const selectTable = () =>
  page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#rendered table'));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
await selectTable();
await page.evaluate(() => window.__send({ type: 'copy-table', notation: 'backlog' }));
await page.waitForTimeout(400);
check(
  'Backlog 記法でコピーし rowspan を展開する',
  await page.evaluate(() => navigator.clipboard.readText()),
  ['| 担当 | 状態   | 期限       |h', '| 田中 | 処理中 | 2026-10-01 |', '| 鈴木 | 未対応 | 2026-10-05 |', '| 鈴木 | 完了   | 2026-09-30 |'].join('\n'),
);
await selectTable();
await page.evaluate(() => window.__send({ type: 'copy-table', notation: 'markdown' }));
await page.waitForTimeout(400);
check(
  'Markdown でコピーする',
  (await page.evaluate(() => navigator.clipboard.readText())).split('\n')[1],
  '| ---- | ------ | ---------- |',
);

await browser.close();
server.close();

if (problems.length > 0) {
  console.log('\nページ内のエラー:');
  problems.forEach((p) => console.log(`  ${p}`));
}
console.log(failures.length === 0 ? '\nすべて期待どおりです。' : `\n${failures.length} 件が期待と違います。`);
process.exit(failures.length === 0 && problems.length === 0 ? 0 : 1);
