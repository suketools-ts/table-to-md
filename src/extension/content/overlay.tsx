import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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

/** オーバーレイの枠を出し、中身を描く。閉じ方（Esc・背景クリック）も共通。 */
function mount(render: (close: () => void) => ReactNode): void {
  const shadowRoot = ensureShadow();
  closeEditor();

  const container = document.createElement('div');
  container.className = 'tt-root';
  shadowRoot.appendChild(container);

  const close = () => {
    closeEditor();
    document.removeEventListener('keydown', onKeyDown, true);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    // セル編集中の Esc は入力の取り消しに使われるため、グリッドの外でだけ閉じる。
    if (event.key !== 'Escape') return;
    const active = shadowRoot.activeElement;
    if (active instanceof HTMLElement && active.closest('.masume-grid')) return;
    event.stopPropagation();
    close();
  };
  document.addEventListener('keydown', onKeyDown, true);

  // 背景（モーダルの外側）のクリックでも閉じる。
  container.addEventListener('mousedown', (event) => {
    if (event.target === container) close();
  });

  root = createRoot(container);
  root.render(render(close));
}

export function closeEditor(): void {
  root?.unmount();
  root = null;
  const container = shadow?.querySelector('.tt-root');
  container?.remove();
}

/** 編集画面を開く。既に開いていれば差し替える。 */
export function openEditor(props: Omit<TableEditorProps, 'onCancel'> & { onCancel?: () => void }) {
  mount((close) => (
    <TableEditor
      {...props}
      onSubmit={(table, notation) => {
        props.onSubmit(table, notation);
        close();
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
