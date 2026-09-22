import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import gridCss from 'react-masume-grid/styles.css?inline';
import overlayCss from './overlay.css?inline';
import { TableEditor, type TableEditorProps } from './TableEditor';
import { SourceDialog, type SourceDialogProps } from './SourceDialog';

/**
 * オーバーレイは Shadow DOM の中に立てる。
 * ページ側の CSS を持ち込まず、こちらの CSS も外へ漏らさないため。
 * スタイルは文字列として取り込み（?inline）、シャドウルート内に閉じ込める。
 */
const HOST_ID = 'table-to-md-overlay-host';

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let root: Root | null = null;
/** 開く前にフォーカスがあった要素。閉じたら戻す。 */
let restoreFocus: HTMLElement | null = null;

function ensureShadow(): ShadowRoot {
  if (shadow) return shadow;
  host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `${gridCss}\n${overlayCss}`;
  shadow.appendChild(style);
  return shadow;
}

/**
 * 開いた直後にフォーカスを当てる要素を選ぶ。
 *
 * グリッドはキー入力を隠しテキストエリアで受けているので、そこに当てると
 * 開いてすぐ矢印キーと直接入力でセルを操作できる。グリッドが無いダイアログは
 * `data-autofocus` を付けた要素に当てる。どちらも無ければ枠そのもの。
 */
function focusTarget(container: HTMLElement): HTMLElement {
  return (
    container.querySelector<HTMLElement>('.masume-grid-editor') ??
    container.querySelector<HTMLElement>('[data-autofocus]') ??
    container
  );
}

/** オーバーレイの枠を出し、中身を描く。閉じ方（Esc・背景クリック）も共通。 */
function mount(render: (close: () => void) => ReactNode): void {
  const shadowRoot = ensureShadow();
  // フォーカスがオーバーレイの中にあるなら、それは開き直しなので元の復帰先を保つ。
  // シャドウルートの中に居る間、document.activeElement はホスト要素を指す。
  const active = document.activeElement;
  const previous = active instanceof HTMLElement && active !== host ? active : restoreFocus;
  closeEditor();

  const container = document.createElement('div');
  container.className = 'tt-root';
  // フォーカスの受け皿。中に当てる先が無いときでも、ページ側の入力欄から
  // フォーカスを引き取れるようにしておく。
  container.tabIndex = -1;
  shadowRoot.appendChild(container);
  restoreFocus = previous;

  const close = () => {
    closeEditor();
    document.removeEventListener('keydown', onKeyDown, true);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    // セル編集中の Esc は入力の取り消しに使われるため、そのときだけグリッドに渡す。
    // グリッドはキー入力を隠しテキストエリアで受けていて、編集していない間は
    // --hidden が付く。フォーカスの位置では区別できないのでこちらで見る。
    if (event.key !== 'Escape') return;
    const editing = shadowRoot.querySelector('.masume-grid-editor:not(.masume-grid-editor--hidden)');
    if (editing) return;
    event.stopPropagation();
    close();
  };
  document.addEventListener('keydown', onKeyDown, true);

  // 背景（モーダルの外側）のクリックでも閉じる。
  container.addEventListener('mousedown', (event) => {
    if (event.target === container) close();
  });

  root = createRoot(container);
  // 右クリックから開くとフォーカスはページの入力欄に残ったままで、キー入力が
  // ダイアログではなく後ろの入力欄へ流れてしまう。描画を待ってから奪う必要があるので、
  // ここだけ同期的に描画して、その場でフォーカスを移す。
  flushSync(() => root?.render(render(close)));
  focusTarget(container).focus({ preventScroll: true });
}

export function closeEditor(): void {
  root?.unmount();
  root = null;
  const container = shadow?.querySelector('.tt-root');
  container?.remove();

  const previous = restoreFocus;
  restoreFocus = null;
  // ページから外れた要素に focus() しても何も起きないので、残っている場合だけ戻す。
  if (previous?.isConnected) previous.focus({ preventScroll: true });
}

/** 編集画面を開く。既に開いていれば差し替える。 */
export function openEditor(props: Omit<TableEditorProps, 'onCancel'> & { onCancel?: () => void }) {
  mount((close) => (
    <TableEditor
      {...props}
      onSubmit={(table, notation) => {
        // 先に閉じてフォーカスを入力欄へ戻してから書き戻す。書き戻しは選択範囲を
        // 組み立てながら進むので、その途中でフォーカスが動くと挿入位置がずれる。
        close();
        props.onSubmit(table, notation);
      }}
      onCancel={() => {
        props.onCancel?.();
        close();
      }}
    />
  ));
}

/** 表をソースに変換して見せるダイアログを開く。 */
export function openSourceDialog(props: Omit<SourceDialogProps, 'onClose'>) {
  mount((close) => <SourceDialog {...props} onClose={close} />);
}

let toastTimer: number | undefined;

/** 画面下部に短いメッセージを出す。コピー結果の確認用。 */
export function showToast(message: string): void {
  const shadowRoot = ensureShadow();
  shadowRoot.querySelector('.tt-toast')?.remove();
  window.clearTimeout(toastTimer);

  const toast = document.createElement('div');
  toast.className = 'tt-toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  shadowRoot.appendChild(toast);
  toastTimer = window.setTimeout(() => toast.remove(), 3000);
}
