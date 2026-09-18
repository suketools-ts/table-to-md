/**
 * 入力欄をひとつの形で扱うための薄い層。
 * `<textarea>` と contenteditable では値の読み方もカーソル位置の求め方も違うので、
 * 呼び出し側がその差を意識しなくていいようにここで吸収する。
 */
export interface EditableTarget {
  readonly el: HTMLElement;
  /** 入力欄全体のソーステキスト。 */
  getValue(): string;
  /** 選択範囲（未選択なら start === end がカーソル位置）。 */
  getSelection(): { start: number; end: number };
  /**
   * 文字位置 start〜end を text で置き換える。
   * ページ側の取り消し履歴を壊さず input イベントも飛ぶ経路を優先する。
   */
  replaceRange(start: number, end: number, text: string): boolean;
}

function isTextInput(el: Element): el is HTMLTextAreaElement | HTMLInputElement {
  if (el instanceof HTMLTextAreaElement) return true;
  // 1 行入力でも表を書くことはないが、判定だけは通しておく。
  return el instanceof HTMLInputElement && /^(text|search|url|tel|email)$/.test(el.type);
}

function isContentEditable(el: Element): el is HTMLElement {
  return el instanceof HTMLElement && el.isContentEditable;
}

/**
 * `execCommand('insertText')` は古い API だが、ページの取り消し履歴（Ctrl+Z）を保ったまま
 * 文字を挿入し、`input` イベントも発生させられる唯一の手段なのでこれを第一手にする。
 */
function insertText(text: string): boolean {
  try {
    return document.execCommand('insertText', false, text);
  } catch {
    return false;
  }
}

class TextInputTarget implements EditableTarget {
  readonly el: HTMLTextAreaElement | HTMLInputElement;

  constructor(el: HTMLTextAreaElement | HTMLInputElement) {
    this.el = el;
  }

  getValue(): string {
    return this.el.value;
  }

  getSelection() {
    return {
      start: this.el.selectionStart ?? this.el.value.length,
      end: this.el.selectionEnd ?? this.el.value.length,
    };
  }

  replaceRange(start: number, end: number, text: string): boolean {
    this.el.focus();
    this.el.setSelectionRange(start, end);
    if (insertText(text)) return true;

    // execCommand が使えない場合の退避策。React などが value を監視している場合に
    // 変更を拾わせるため、プロトタイプ側の setter を通してから input を発火させる。
    const next = this.el.value.slice(0, start) + text + this.el.value.slice(end);
    const proto =
      this.el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) return false;
    setter.call(this.el, next);
    this.el.setSelectionRange(start + text.length, start + text.length);
    this.el.dispatchEvent(new Event('input', { bubbles: true }));
    this.el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
}

/** contenteditable 内のテキストノードを、文字位置つきで順に並べる。 */
function textNodes(root: HTMLElement): Array<{ node: Text; start: number; end: number }> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const result: Array<{ node: Text; start: number; end: number }> = [];
  let offset = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const length = node.data.length;
    result.push({ node, start: offset, end: offset + length });
    offset += length;
    node = walker.nextNode() as Text | null;
  }
  return result;
}

class ContentEditableTarget implements EditableTarget {
  readonly el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  getValue(): string {
    // innerText は表示上の改行を反映するので、ソースとして読むにはこちらが近い。
    return this.el.innerText;
  }

  /** DOM 上の位置を、getValue() の文字位置に直す。 */
  private offsetOf(container: Node, offset: number): number {
    const nodes = textNodes(this.el);
    if (container.nodeType === Node.TEXT_NODE) {
      const found = nodes.find((entry) => entry.node === container);
      return found ? found.start + offset : 0;
    }
    // 要素ノードを指している場合は、その手前までの文字数を足し合わせる。
    const child = container.childNodes[offset];
    if (!child) return this.getValue().length;
    const found = nodes.find((entry) => entry.node === child || child.contains(entry.node));
    return found ? found.start : 0;
  }

  getSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const length = this.getValue().length;
      return { start: length, end: length };
    }
    const range = selection.getRangeAt(0);
    const start = this.offsetOf(range.startContainer, range.startOffset);
    const end = this.offsetOf(range.endContainer, range.endOffset);
    return { start: Math.min(start, end), end: Math.max(start, end) };
  }

  private locate(offset: number): { node: Text; offset: number } | null {
    const nodes = textNodes(this.el);
    if (nodes.length === 0) return null;
    const found = nodes.find((entry) => offset >= entry.start && offset <= entry.end);
    const entry = found ?? nodes[nodes.length - 1];
    return { node: entry.node, offset: Math.min(offset - entry.start, entry.node.data.length) };
  }

  replaceRange(start: number, end: number, text: string): boolean {
    const from = this.locate(start);
    const to = this.locate(end);
    if (!from || !to) return false;

    this.el.focus();
    const range = document.createRange();
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(range);
    return insertText(text);
  }
}

/** 要素を EditableTarget として扱えるなら包んで返す。扱えなければ null。 */
export function asEditable(el: Element | null): EditableTarget | null {
  if (!el) return null;
  if (isTextInput(el)) return new TextInputTarget(el);
  if (isContentEditable(el)) return new ContentEditableTarget(el);
  return null;
}
