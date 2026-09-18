import { useMemo, useState } from 'react';
import type { NormalizedRange } from 'react-masume-grid';
import { TableGrid } from '../../components/TableGrid';
import { AlignmentBar } from '../../components/AlignmentBar';
import type { Align, TableModel } from '../../lib/types';
import { columnCount, fitAligns, normalizeRows } from '../../lib/types';
import type { Notation } from '../../lib/parse/notation';
import {
  insertColumn,
  insertRow,
  removeColumn,
  removeRow,
  setAlign,
  setAllAligns,
  transpose,
} from '../../lib/table-ops';
import { useTableHistory } from '../../lib/useTableHistory';

export interface TableEditorProps {
  initial: TableModel;
  /** 開いた時点の記法。編集時はソースから自動判定した結果が入る。 */
  notation: Notation;
  /** カーソル位置に表があったか。挿入と置き換えでボタンの文言を変える。 */
  mode: 'insert' | 'replace';
  /** 自動判定の根拠を添える一言（判定できなかった場合など）。 */
  notationNote?: string;
  onSubmit: (table: TableModel, notation: Notation) => void;
  onCancel: () => void;
}

const NOTATION_LABEL: Record<Notation, string> = {
  backlog: 'Backlog 記法',
  markdown: 'Markdown',
};

export function TableEditor({
  initial,
  notation: initialNotation,
  mode,
  notationNote,
  onSubmit,
  onCancel,
}: TableEditorProps) {
  const { table, setTable, undo, redo, canUndo, canRedo } = useTableHistory(initial);
  const [notation, setNotation] = useState<Notation>(initialNotation);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);

  const rows = useMemo(() => normalizeRows(table.rows), [table.rows]);
  const cols = columnCount(rows);
  const aligns = useMemo(() => fitAligns(table.aligns, cols), [table.aligns, cols]);
  const headers = useMemo(
    () => (table.hasHeader ? (rows[0] ?? []) : []),
    [rows, table.hasHeader],
  );

  const activeRow = selection?.top ?? rows.length - 1;
  const activeCol = selection?.left ?? cols - 1;

  return (
    <div className="tt-modal" role="dialog" aria-modal="true" aria-label="表の編集">
      <div className="tt-modal__head">
        <h2 className="tt-modal__title">{mode === 'replace' ? '表を編集' : '表を挿入'}</h2>
        <button type="button" className="tt-close" onClick={onCancel} aria-label="閉じる">
          ×
        </button>
      </div>

      <div className="tt-toolbar">
        <label className="tt-field tt-field--check">
          <input
            type="checkbox"
            checked={table.hasHeader}
            onChange={(e) => setTable((prev) => ({ ...prev, hasHeader: e.target.checked }))}
          />
          1 行目を見出しにする
        </label>
        <span className="tt-spacer" />
        <button type="button" onClick={undo} disabled={!canUndo}>
          元に戻す
        </button>
        <button type="button" onClick={redo} disabled={!canRedo}>
          やり直す
        </button>
      </div>

      <div className="tt-toolbar">
        <span className="tt-label">行</span>
        <button type="button" onClick={() => setTable((p) => insertRow(p, activeRow))}>
          上に挿入
        </button>
        <button type="button" onClick={() => setTable((p) => insertRow(p, activeRow + 1))}>
          下に挿入
        </button>
        <button
          type="button"
          onClick={() => setTable((p) => removeRow(p, activeRow))}
          disabled={rows.length <= 1}
        >
          削除
        </button>
        <span className="tt-label">列</span>
        <button type="button" onClick={() => setTable((p) => insertColumn(p, activeCol))}>
          左に挿入
        </button>
        <button type="button" onClick={() => setTable((p) => insertColumn(p, activeCol + 1))}>
          右に挿入
        </button>
        <button
          type="button"
          onClick={() => setTable((p) => removeColumn(p, activeCol))}
          disabled={cols <= 1}
        >
          削除
        </button>
        <span className="tt-spacer" />
        <button type="button" onClick={() => setTable(transpose)}>
          行列入替
        </button>
      </div>

      <TableGrid
        table={table}
        onChange={(next) => setTable((prev) => ({ ...prev, rows: next }))}
        onSelectionChange={setSelection}
        height={300}
      />

      {notation === 'markdown' && (
        <AlignmentBar
          aligns={aligns}
          headers={headers}
          onChange={(col, align: Align) => setTable((p) => setAlign(p, col, align))}
          onChangeAll={(align: Align) => setTable((p) => setAllAligns(p, align))}
        />
      )}

      <div className="tt-foot">
        <label className="tt-field">
          記法
          <select value={notation} onChange={(e) => setNotation(e.target.value as Notation)}>
            <option value="backlog">{NOTATION_LABEL.backlog}</option>
            <option value="markdown">{NOTATION_LABEL.markdown}</option>
          </select>
        </label>
        {notationNote && <span className="tt-note">{notationNote}</span>}
        <span className="tt-spacer" />
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
        <button type="button" className="tt-primary" onClick={() => onSubmit(table, notation)}>
          {mode === 'replace' ? 'この内容で置き換える' : 'カーソル位置に挿入'}
        </button>
      </div>
    </div>
  );
}
