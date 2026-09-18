import type { Command } from '../messages';
import { asEditable, type EditableTarget } from './editable';
import { tablesInSelection } from './selection';
import { closeEditor, openEditor, showToast } from './overlay';
import { findTableBlockAt, padForInsertion } from '../../lib/table-block';
import { detectNotation, parseNotation, type Notation } from '../../lib/parse/notation';
import { parseHtmlTable } from '../../lib/parse/html';
import { toBacklog } from '../../lib/format/backlog';
import { toMarkdown } from '../../lib/format/markdown';
import { copyToClipboard } from '../../lib/clipboard';
import type { TableModel } from '../../lib/types';
import { normalizeRows } from '../../lib/types';
import { emptyTable } from '../../lib/table-ops';

const NOTATION_LABEL: Record<Notation, string> = {
  backlog: 'Backlog 記法',
  markdown: 'Markdown',
};

/**
 * 右クリックされた要素は、メニューのクリックイベントからは辿れない。
 * そこで contextmenu を capture 段階で拾い、対象の要素とカーソル位置を控えておく。
 * メニューが開いている間にページ側で選択が変わることがあるため、位置もここで固定する。
 */
let lastTarget: { editable: EditableTarget; start: number; end: number } | null = null;

document.addEventListener(
  'contextmenu',
  (event) => {
    const editable = asEditable(event.target as Element | null);
    if (!editable) {
      lastTarget = null;
      return;
    }
    const { start, end } = editable.getSelection();
    lastTarget = { editable, start, end };
  },
  true,
);

/** 表をソースに変換する。 */
function formatTable(table: TableModel, notation: Notation): string {
  return notation === 'backlog' ? toBacklog(table) : toMarkdown(table);
}

/** カーソル位置の表を編集する。表が無ければ新規作成として開く。 */
function editTableAtCaret(): void {
  const target = lastTarget;
  if (!target) {
    showToast('入力欄の上で右クリックしてください。');
    return;
  }

  const source = target.editable.getValue();
  const block = findTableBlockAt(source, target.start);

  if (block) {
    // 編集時の記法は、その表そのものから判定する。
    const notation = detectNotation(block.text, detectNotation(source));
    const parsed = parseNotation(block.text, notation);
    openEditor({
      initial: {
        rows: normalizeRows(parsed.rows),
        hasHeader: parsed.hasHeader,
        aligns: parsed.aligns,
      },
      notation,
      mode: 'replace',
      notationNote: `自動判定: ${NOTATION_LABEL[notation]}`,
      onSubmit: (table, chosen) => {
        target.editable.replaceRange(block.start, block.end, formatTable(table, chosen));
      },
    });
    return;
  }

  // 新規作成では判定の材料が表自体に無いので、入力欄全体の書きぶりから推定する。
  const guessed = detectNotation(source);
  const note =
    source.trim() === ''
      ? '判定材料が無いため既定値です'
      : `自動判定: ${NOTATION_LABEL[guessed]}（入力欄全体から推定）`;
  openEditor({
    initial: emptyTable(3, 3),
    notation: guessed,
    mode: 'insert',
    notationNote: note,
    onSubmit: (table, chosen) => {
      // 前後の段落と表がくっついて誤解釈されないよう、空行で挟む。
      const text = padForInsertion(
        source.slice(0, target.start),
        source.slice(target.end),
        formatTable(table, chosen),
      );
      target.editable.replaceRange(target.start, target.end, text);
    },
  });
}

/** 選択範囲の表を指定された記法でコピーする。 */
async function copySelectedTable(notation: Notation): Promise<void> {
  const tables = tablesInSelection(window.getSelection());
  if (tables.length === 0) {
    showToast('選択範囲に表が見つかりませんでした。');
    return;
  }

  const sources = tables.map((table) => {
    const parsed = parseHtmlTable(table.outerHTML);
    const model: TableModel = {
      rows: normalizeRows(parsed.rows),
      hasHeader: parsed.hasHeader,
      aligns: parsed.aligns,
    };
    return formatTable(model, notation);
  });

  const ok = await copyToClipboard(sources.join('\n\n'));
  const count = tables.length > 1 ? `${tables.length} 個の表を` : '';
  showToast(
    ok
      ? `${count}${NOTATION_LABEL[notation]}でコピーしました。`
      : 'クリップボードへの書き込みが拒否されました。',
  );
}

chrome.runtime.onMessage.addListener((message: Command) => {
  if (message.type === 'edit-table') {
    editTableAtCaret();
    return;
  }
  if (message.type === 'copy-table') {
    void copySelectedTable(message.notation);
  }
});

// ページ遷移で残骸が出ないよう、離脱時に閉じる。
window.addEventListener('pagehide', closeEditor);
