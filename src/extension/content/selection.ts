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
