import { useMemo } from 'react';
import { MasumeGrid } from 'react-masume-grid';
import type { NormalizedRange } from 'react-masume-grid';
import type { Align, TableModel } from '../lib/types';
import { columnCount, fitAligns, normalizeRows } from '../lib/types';

interface Props {
  table: TableModel;
  onChange: (rows: string[][]) => void;
  onSelectionChange: (range: NormalizedRange | null) => void;
  height: number;
}

const ALIGN_TO_CSS: Record<Align, 'left' | 'center' | 'right'> = {
  default: 'left',
  left: 'left',
  center: 'center',
  right: 'right',
};

/**
 * 表の編集グリッド。1 行目を見出しとして扱う設定のときは、その行を
 * 見た目でも見出しらしく（太字・背景色）表示する。
 *
 * `columns` はあえて渡していない。列定義があると貼り付けが最終列で切り捨てられるため、
 * 列数はデータ側に追従させて、貼り付けだけで表を広げられるようにしている。
 */
export function TableGrid({ table, onChange, onSelectionChange, height }: Props) {
  const rows = useMemo(() => normalizeRows(table.rows), [table.rows]);
  const aligns = useMemo(
    () => fitAligns(table.aligns, columnCount(rows)),
    [table.aligns, rows],
  );

  return (
    <MasumeGrid
      data={rows}
      onChange={onChange}
      onSelectionChange={(ranges) => onSelectionChange(ranges[0] ?? null)}
      getCellProps={(row, col) => {
        const textAlign = ALIGN_TO_CSS[aligns[col] ?? 'default'];
        if (table.hasHeader && row === 0) {
          return {
            style: { fontWeight: 700, background: 'var(--header-cell-bg)', textAlign },
          };
        }
        return { style: { textAlign } };
      }}
      appendBlankRow
      showRowNumbers
      rowHeight={30}
      defaultColumnWidth={150}
      style={{ height }}
    />
  );
}
