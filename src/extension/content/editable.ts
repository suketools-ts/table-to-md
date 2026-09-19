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
   * リッチエディタに選択範囲を認識させる待ちが要るため非同期。
   */
  replaceRange(start: number, end: number, text: string): Promise<boolean>;
}

function isTextInput(el: Element): el is HTMLTextAreaElement | HTMLInputElement {
  if (el instanceof HTMLTextAreaElement) return true;
  // 1 行入力で表を書くことはないが、判定だけは通しておく。
  return el instanceof HTMLInputElement && /^(text|search|url|tel|email)$/.test(el.type);
}

/**
 * contenteditable の「編集ホスト」（contenteditable を宣言している根本の要素）を探す。
 *
 * 右クリックの対象は編集ホストではなく中の `<p>` などになる。contenteditable は
 * 子孫に継承されるので `<p>` 自体も isContentEditable が true になり、そのまま扱うと
 * 段落 1 つだけを入力欄と誤認してしまう。編集可能な祖先をたどって根本を取る。
 */
function editingHost(start: Element | null): HTMLElement | null {
  let host: HTMLElement | null = null;
  let node: Element | null = start;
  while (node instanceof HTMLElement && node.isContentEditable) {
    host = node;
    node = node.parentElement;
  }
  return host;
}

/**
 * `execCommand('insertText')` は古い API だが、ページの取り消し履歴（Ctrl+Z）を保ったまま
 * 文字を挿入し、`input` イベントも発生させられる手段なのでこれを第一手にする。
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

  async replaceRange(start: number, end: number, text: string): Promise<boolean> {
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 1 行 1 段落の HTML にする。
 *
 * ProseMirror はプレーンテキストの貼り付けを `split(/(?:\r\n?|\n)+/)` で行に割るため、
 * 連続する改行が 1 つに潰れて空行を作れない。Markdown の表は直前に空行が無いと
 * 表として解釈されないので、空行を保てる HTML も一緒に渡す。
 *
 * ただし HTML は既定で連続する空白を 1 つに畳んでしまい、桁そろえのための空白が
 * 失われる。`white-space: pre-wrap` を指定するとエディタ側の HTML 解釈が
 * 空白を保つようになるので、空行と桁そろえの両方を残せる。
 */
function asParagraphs(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      line === '' ? '<p><br></p>' : `<p style="white-space:pre-wrap">${escapeHtml(line)}</p>`,
    )
    .join('');
}

/** 次のタスクまで待つ。selectionchange など非同期に伝わるイベントを挟むため。 */
function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** 1 行として扱うブロック要素。 */
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TR', 'DT', 'DD',
]);

/** テキストノードと、組み立てた文字列上での位置の対応。 */
interface Piece {
  node: Text;
  start: number;
  end: number;
}

/**
 * contenteditable の中身をソーステキストとして組み立てる。
 *
 * ProseMirror などのエディタは 1 行を 1 つの `<p>` で表す。`innerText` はブロック要素に
 * 余分な改行を入れるため行がずれるので、ブロック要素を 1 行として自前で組み立てる。
 * 併せて、文字位置から DOM の位置を引けるようテキストノードの対応表も作る。
 */
export function serialize(host: HTMLElement): { text: string; pieces: Piece[] } {
  let text = '';
  const pieces: Piece[] = [];
  let blockSeen = false;

  const isPlaceholderBreak = (el: Element) => el === el.parentNode?.lastChild;

  const walk = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const data = (child as Text).data;
        pieces.push({ node: child as Text, start: text.length, end: text.length + data.length });
        text += data;
        continue;
      }
      if (!(child instanceof HTMLElement)) continue;

      if (child.tagName === 'BR') {
        // 空段落を保つための末尾の `<br>`（ProseMirror-trailingBreak など）は行に数えない。
        if (!isPlaceholderBreak(child)) text += '\n';
        continue;
      }
      if (BLOCK_TAGS.has(child.tagName)) {
        if (blockSeen) text += '\n';
        blockSeen = true;
      }
      walk(child);
    }
  };

  walk(host);
  return { text, pieces };
}

class ContentEditableTarget implements EditableTarget {
  readonly el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  getValue(): string {
    return serialize(this.el).text;
  }

  /** DOM 上の位置を、getValue() の文字位置に直す。 */
  private offsetOf(pieces: Piece[], container: Node, offset: number): number {
    if (container.nodeType === Node.TEXT_NODE) {
      const found = pieces.find((piece) => piece.node === container);
      return found ? found.start + Math.min(offset, found.node.data.length) : 0;
    }
    // 要素ノードを指している場合は、その位置より後ろにある最初のテキストノードに寄せる。
    const child = container.childNodes[offset];
    if (!child) {
      const inside = pieces.filter((piece) => container.contains(piece.node));
      return inside.length > 0 ? inside[inside.length - 1].end : 0;
    }
    const found = pieces.find((piece) => piece.node === child || child.contains(piece.node));
    return found ? found.start : 0;
  }

  getSelection() {
    const { text, pieces } = serialize(this.el);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { start: text.length, end: text.length };

    const range = selection.getRangeAt(0);
    if (!this.el.contains(range.startContainer)) return { start: text.length, end: text.length };

    const start = this.offsetOf(pieces, range.startContainer, range.startOffset);
    const end = this.offsetOf(pieces, range.endContainer, range.endOffset);
    return { start: Math.min(start, end), end: Math.max(start, end) };
  }

  /** 文字位置に対応する DOM の位置を求める。 */
  private locate(pieces: Piece[], offset: number): { node: Text; offset: number } | null {
    if (pieces.length === 0) return null;
    const inside = pieces.find((piece) => offset >= piece.start && offset <= piece.end);
    const piece = inside ?? (offset < pieces[0].start ? pieces[0] : pieces[pieces.length - 1]);
    return {
      node: piece.node,
      offset: Math.max(0, Math.min(offset - piece.start, piece.node.data.length)),
    };
  }

  async replaceRange(start: number, end: number, text: string): Promise<boolean> {
    const { pieces } = serialize(this.el);
    const from = this.locate(pieces, start);
    const to = this.locate(pieces, end);
    if (!from || !to) return false;

    // ProseMirror などのエディタは自前の選択状態を持っていて、フォーカス時にそれを
    // DOM 側へ復元する。先にフォーカスを戻し、復元が済んでから選択を上書きする。
    this.el.focus();
    await nextTask();

    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    selection.removeAllRanges();
    selection.addRange(range);

    // DOM の選択変更は selectionchange イベント経由で非同期に伝わる。エディタが
    // 内部状態へ取り込むのを待たずに貼り付けると、元のカーソル位置に挿入されてしまう。
    await nextTask();

    // リッチエディタは DOM を直接書き換えられることを想定しておらず、自前で入力を
    // 解釈して内部状態を更新する。複数行を行の構造ごと正しく解釈してもらえるよう、
    // 貼り付けとして渡すのが最も確実。
    const transfer = new DataTransfer();
    transfer.setData('text/plain', text);
    transfer.setData('text/html', asParagraphs(text));
    const event = new ClipboardEvent('paste', {
      clipboardData: transfer,
      bubbles: true,
      cancelable: true,
    });
    this.el.dispatchEvent(event);
    if (event.defaultPrevented) return true;

    // 誰も貼り付けを処理しなかった場合（素の contenteditable）はこちら。
    // 合成イベントでは既定の貼り付け動作が走らないため、自分で挿入する。
    return insertText(text);
  }
}

/** 要素を EditableTarget として扱えるなら包んで返す。扱えなければ null。 */
export function asEditable(el: Element | null): EditableTarget | null {
  if (!el) return null;
  if (isTextInput(el)) return new TextInputTarget(el);
  const host = editingHost(el);
  return host ? new ContentEditableTarget(host) : null;
}
