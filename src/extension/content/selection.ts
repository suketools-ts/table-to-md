/**
 * ページ上の「対象にすべき表」を見つける。
 *
 * 範囲選択しているときはその選択から、していないときは右クリックした位置から探す。
 */

/**
 * 選択範囲にかかっている `<table>` を拾う。
 *
 * 選択の一部だけがテーブルにかかっていても表全体を対象にする。表の途中から
 * 途中までをドラッグしたときに半端な行だけ取り出しても使い道がないため。
 */
export function tablesInSelection(selection: Selection | null): HTMLTableElement[] {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return [];
  const range = selection.getRangeAt(0);

  // 選択が表の内側で完結している場合は、囲んでいる表そのものを返す。
  const container =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;
  const enclosing = container?.closest('table');
  if (enclosing) return [enclosing];

  // 表をまたぐ選択では、範囲に重なる表をすべて拾う。
  const root = container ?? document.body;
  return Array.from(root.querySelectorAll('table')).filter((table) => {
    try {
      return range.intersectsNode(table);
    } catch {
      return false;
    }
  });
}

/**
 * さかのぼる親要素の数の上限。「その辺り」と言える範囲に留めるための歯止め。
 * 際限なくさかのぼると最後は body に行き着き、ページ上の無関係な表まで拾ってしまう。
 */
const SEARCH_DEPTH = 6;

/**
 * 右クリックした位置から見て「その辺りにある」表を拾う。
 *
 * セルの上で右クリックしたときはその表。表そのものの外（コメント本文の段落など）で
 * あれば、表を含む最も近い祖先までさかのぼってその中の表を返す。こうすると
 * 「そのコメントの表」だけが選ばれ、離れた位置の表は巻き込まない。
 */
export function tablesNear(element: Element | null): HTMLTableElement[] {
  if (!element) return [];

  const inside = element.closest('table');
  if (inside) return [inside];

  let node: Element | null = element;
  for (let depth = 0; node && node !== document.body && depth < SEARCH_DEPTH; depth += 1) {
    const tables = Array.from(node.querySelectorAll('table'));
    if (tables.length > 0) return tables;
    node = node.parentElement;
  }
  return [];
}
