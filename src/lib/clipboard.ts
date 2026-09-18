/**
 * クリップボードへ書き込む。`text/html` も渡すと、表としての貼り付けに対応した
 * アプリ（Excel、Google スプレッドシート、リッチテキストエディタなど）では
 * 表の形のまま貼り付けられる。
 *
 * `navigator.clipboard` が使えない環境（http、古いブラウザ）では
 * `document.execCommand('copy')` に退避する。
 */
export async function copyToClipboard(text: string, html?: string): Promise<boolean> {
  try {
    if (html && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return true;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 権限が無い場合などは下の退避策に回す。
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

/** クリップボードから読み取る。HTML が取れればそれも返す。 */
export async function readClipboard(): Promise<{ text: string; html?: string } | null> {
  try {
    if (navigator.clipboard?.read && typeof ClipboardItem !== 'undefined') {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const html = item.types.includes('text/html')
          ? await (await item.getType('text/html')).text()
          : undefined;
        const text = item.types.includes('text/plain')
          ? await (await item.getType('text/plain')).text()
          : '';
        if (text || html) return { text, html };
      }
    }
    if (navigator.clipboard?.readText) {
      return { text: await navigator.clipboard.readText() };
    }
  } catch {
    // 読み取り権限が無い場合は null を返し、呼び出し側で貼り付け欄に誘導する。
  }
  return null;
}
