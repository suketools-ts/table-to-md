import { useMemo, useState } from 'react';
import type { TableModel } from '../../lib/types';
import type { Notation } from '../../lib/parse/notation';
import { toBacklog } from '../../lib/format/backlog';
import { toMarkdown } from '../../lib/format/markdown';
import { copyToClipboard } from '../../lib/clipboard';

export interface SourceDialogProps {
  /** 変換対象の表。ページ上で複数見つかった場合は順に並べる。 */
  tables: TableModel[];
  /** 最初に表示する記法。 */
  notation: Notation;
  onClose: () => void;
}

const NOTATION_LABEL: Record<Notation, string> = {
  backlog: 'Backlog 記法',
  markdown: 'Markdown',
};

/**
 * 表示中の表をソースに変換して見せるダイアログ。
 * 記法を切り替えながら中身を確かめて、そのままコピーできるようにする。
 */
export function SourceDialog({ tables, notation: initial, onClose }: SourceDialogProps) {
  const [notation, setNotation] = useState<Notation>(initial);
  const [pad, setPad] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const source = useMemo(
    () =>
      tables
        .map((table) =>
          notation === 'backlog'
            ? toBacklog(table, { pad, headerStyle: 'suffix' })
            : toMarkdown(table, { pad }),
        )
        .join('\n\n'),
    [tables, notation, pad],
  );

  const handleCopy = async () => {
    const ok = await copyToClipboard(source);
    setMessage(
      ok
        ? `${NOTATION_LABEL[notation]}でコピーしました。`
        : 'クリップボードへの書き込みが拒否されました。下の欄から手動でコピーしてください。',
    );
    window.setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="tt-modal tt-modal--narrow" role="dialog" aria-modal="true" aria-label="表のソース">
      <div className="tt-modal__head">
        <h2 className="tt-modal__title">表をソースに変換</h2>
        <button type="button" className="tt-close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
      </div>

      <div className="tt-tabs" role="tablist">
        {(['backlog', 'markdown'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={notation === value}
            className={`tt-tab${notation === value ? ' tt-tab--on' : ''}`}
            onClick={() => setNotation(value)}
          >
            {NOTATION_LABEL[value]}
          </button>
        ))}
        <span className="tt-spacer" />
        <label className="tt-field tt-field--check">
          <input type="checkbox" checked={pad} onChange={(e) => setPad(e.target.checked)} />
          列幅をそろえる
        </label>
      </div>

      <textarea
        className="tt-source"
        data-autofocus
        value={source}
        readOnly
        spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
      />

      <div className="tt-foot">
        <span className="tt-note">
          {tables.length > 1 ? `${tables.length} 個の表を変換しました` : `${source.split('\n').length} 行`}
        </span>
        <span className="tt-spacer" />
        <button type="button" onClick={onClose}>
          閉じる
        </button>
        <button type="button" className="tt-primary" onClick={handleCopy}>
          コピー
        </button>
      </div>

      <p className="tt-message" role="status">
        {message ?? ''}
      </p>
    </div>
  );
}
