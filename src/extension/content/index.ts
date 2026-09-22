import type { Command } from '../messages';
import { asEditable, type EditableTarget } from './editable';
import { tablesInSelection, tablesNear } from './selection';
import { closeEditor, openEditor, openSourceDialog, showToast } from './overlay';
import { findTableBlockAt, padForInsertion } from '../../lib/table-block';
import { detectNotation, parseNotation, type Notation } from '../../lib/parse/notation';
import { parseHtmlTable } from '../../lib/parse/html';
import { toBacklog } from '../../lib/format/backlog';
import { toMarkdown } from '../../lib/format/markdown';
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
/** 入力欄に限らず、最後に右クリックされた要素。表を探す起点に使う。 */
let lastElement: Element | null = null;

document.addEventListener(
  'contextmenu',
  (event) => {
    lastElement = event.target as Element | null;
    const editable = asEditable(lastElement);
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

/**
 * 入力欄へ書き戻す。
 * 書き戻しはページ側のエディタの作り次第で失敗し得るので、黙って終わらせず伝える。
 */
async function writeBack(
  editable: EditableTarget,
  start: number,
  end: number,
  text: string,
): Promise<void> {
  const ok = await editable.replaceRange(start, end, text);
  if (!ok) showToast('入力欄へ書き戻せませんでした。');
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
        void writeBack(target.editable, block.start, block.end, formatTable(table, chosen));
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
      void writeBack(target.editable, target.start, target.end, text);
    },
  });
}

/**
 * 右クリックした位置（または選択範囲）の表をソースに変換して見せる。
 *
 * 記法はダイアログ側で切り替えられるようにしてある。表示中の表からソースを起こすとき、
 * どちらの記法で欲しいかはその場の用途によって変わるため。
 */
function convertTableToSource(): void {
  // 明示的に選択しているならそちらを優先し、無ければ右クリック位置から探す。
  const found = tablesInSelection(window.getSelection());
  const tables = found.length > 0 ? found : tablesNear(lastElement);

  if (tables.length === 0) {
    showToast('この辺りに表が見つかりませんでした。');
    return;
  }

  const models: TableModel[] = tables.map((table) => {
    const parsed = parseHtmlTable(table.outerHTML);
    return {
      rows: normalizeRows(parsed.rows),
      hasHeader: parsed.hasHeader,
      aligns: parsed.aligns,
    };
  });

  openSourceDialog({ tables: models, notation: 'backlog' });
}

chrome.runtime.onMessage.addListener((message: Command) => {
  if (message.type === 'edit-table') {
    editTableAtCaret();
    return;
  }
  if (message.type === 'convert-table') {
    convertTableToSource();
  }
});

// ページ遷移で残骸が出ないよう、離脱時に閉じる。
window.addEventListener('pagehide', closeEditor);
