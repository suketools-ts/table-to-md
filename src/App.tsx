import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NormalizedRange } from 'react-masume-grid';
import 'react-masume-grid/styles.css';
import { TableGrid } from './components/TableGrid';
import { AlignmentBar } from './components/AlignmentBar';
import { ImportPanel } from './components/ImportPanel';
import { OutputPanel } from './components/OutputPanel';
import type { Align, ParsedTable, TableModel } from './lib/types';
import { columnCount, fitAligns, normalizeRows } from './lib/types';
import {
  emptyTable,
  insertColumn,
  insertRow,
  removeColumn,
  removeRow,
  setAlign,
  setAllAligns,
  transpose,
  trimCells,
  trimEmpty,
} from './lib/table-ops';
import { useTableHistory } from './lib/useTableHistory';

const SAMPLE: TableModel = {
  rows: [
    ['商品名', '単価', '在庫'],
    ['りんご', '120', '30'],
    ['みかん', '80', '120'],
    ['ぶどう', '450', '8'],
  ],
  hasHeader: true,
  aligns: ['left', 'right', 'right'],
};

export default function App() {
  const { table, setTable, undo, redo, reset, canUndo, canRedo } = useTableHistory(SAMPLE);
  const [selection, setSelection] = useState<NormalizedRange | null>(null);

  const rows = useMemo(() => normalizeRows(table.rows), [table.rows]);
  const cols = columnCount(rows);
  const aligns = useMemo(() => fitAligns(table.aligns, cols), [table.aligns, cols]);
  const headers = useMemo(
    () => (table.hasHeader ? (rows[0] ?? []) : []),
    [rows, table.hasHeader],
  );

  // グリッド側の編集は履歴に積む。選択位置は行数が変わると無効になるため都度クリアする。
  const handleGridChange = useCallback(
    (next: string[][]) => setTable((prev) => ({ ...prev, rows: next })),
    [setTable],
  );

  const activeRow = selection?.top ?? rows.length - 1;
  const activeCol = selection?.left ?? cols - 1;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      if (!meta || event.key.toLowerCase() !== 'z') return;
      const target = event.target as HTMLElement | null;
      // セル編集中やテキスト欄の中では、その入力欄自身の取り消しを邪魔しない。
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const handleImport = useCallback(
    (parsed: ParsedTable, mode: 'replace' | 'append') => {
      if (mode === 'replace') {
        reset({
          rows: normalizeRows(parsed.rows),
          hasHeader: parsed.hasHeader,
          aligns: parsed.aligns,
        });
        setSelection(null);
        return;
      }
      setTable((prev) => {
        // 追加時は見出し行を落とし、列数は広い方に合わせる。
        const incoming = parsed.hasHeader ? parsed.rows.slice(1) : parsed.rows;
        return { ...prev, rows: normalizeRows([...prev.rows, ...incoming]) };
      });
    },
    [reset, setTable],
  );

  return (
    <div className="app">
      <header className="app__head">
        <h1 className="app__title">表 ⇄ Markdown / Backlog 記法 変換ツール</h1>
        <p className="app__lead">
          表を編集して Markdown や Backlog 記法に変換できます。ブラウザ上の表・CSV・TSV を
          貼り付ければ、逆に表へ取り込めます。
        </p>
      </header>

      <main className="app__body">
        <section className="panel panel--grid">
          <header className="panel__head">
            <h2 className="panel__title">表の編集</h2>
            <p className="panel__note">
              セルをダブルクリック（または直接入力）で編集。Ctrl+C / Ctrl+V で範囲コピー＆貼り付け。
            </p>
          </header>

          <div className="toolbar">
            <label className="field field--check">
              <input
                type="checkbox"
                checked={table.hasHeader}
                onChange={(e) => setTable((prev) => ({ ...prev, hasHeader: e.target.checked }))}
              />
              1 行目を見出しにする
            </label>
            <span className="spacer" />
            <button type="button" onClick={undo} disabled={!canUndo} title="元に戻す (Ctrl+Z)">
              元に戻す
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} title="やり直す (Ctrl+Shift+Z)">
              やり直す
            </button>
          </div>

          <div className="toolbar">
            <span className="toolbar__label">行</span>
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

            <span className="toolbar__label">列</span>
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

            <span className="spacer" />
            <button type="button" onClick={() => setTable(transpose)} title="行と列を入れ替える">
              行列入替
            </button>
            <button type="button" onClick={() => setTable(trimCells)} title="各セルの前後の空白を削除">
              空白整理
            </button>
            <button type="button" onClick={() => setTable(trimEmpty)} title="末尾の空行・空列を削除">
              空行除去
            </button>
            <button type="button" onClick={() => reset(emptyTable(3, 3))}>
              全消去
            </button>
          </div>

          <p className="panel__note panel__note--tight">
            選択中: {activeRow + 1} 行目 / {activeCol + 1} 列目
          </p>

          <TableGrid
            table={table}
            onChange={handleGridChange}
            onSelectionChange={setSelection}
            height={360}
          />

          <AlignmentBar
            aligns={aligns}
            headers={headers}
            onChange={(col, align: Align) => setTable((p) => setAlign(p, col, align))}
            onChangeAll={(align: Align) => setTable((p) => setAllAligns(p, align))}
          />
        </section>

        <div className="app__side">
          <OutputPanel table={table} />
          <ImportPanel onApply={handleImport} />
        </div>
      </main>

      <footer className="app__foot">
        表コンポーネントに <code>react-masume-grid</code> を使用しています。
      </footer>
    </div>
  );
}
