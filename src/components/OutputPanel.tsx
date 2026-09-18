import { useMemo, useState } from 'react';
import type { TableModel } from '../lib/types';
import { toBacklog, toCsv, toHtml, toMarkdown, toTsv } from '../lib/format';
import { copyToClipboard } from '../lib/clipboard';

type OutputKind = 'markdown' | 'backlog' | 'csv' | 'tsv' | 'html';

interface Props {
  table: TableModel;
}

const TABS: Array<{ value: OutputKind; label: string; ext: string; mime: string }> = [
  { value: 'markdown', label: 'Markdown', ext: 'md', mime: 'text/markdown' },
  { value: 'backlog', label: 'Backlog 記法', ext: 'txt', mime: 'text/plain' },
  { value: 'csv', label: 'CSV', ext: 'csv', mime: 'text/csv' },
  { value: 'tsv', label: 'TSV', ext: 'tsv', mime: 'text/tab-separated-values' },
  { value: 'html', label: 'HTML', ext: 'html', mime: 'text/html' },
];

/** 変換結果の表示・コピー・ダウンロードを行うパネル。 */
export function OutputPanel({ table }: Props) {
  const [kind, setKind] = useState<OutputKind>('markdown');
  const [pad, setPad] = useState(true);
  const [backlogHeaderStyle, setBacklogHeaderStyle] = useState<'suffix' | 'tilde'>('suffix');
  const [copied, setCopied] = useState<string | null>(null);

  const output = useMemo(() => {
    switch (kind) {
      case 'markdown':
        return toMarkdown(table, { pad });
      case 'backlog':
        return toBacklog(table, { pad, headerStyle: backlogHeaderStyle });
      case 'csv':
        return toCsv(table);
      case 'tsv':
        return toTsv(table);
      case 'html':
        return toHtml(table);
      default:
        return '';
    }
  }, [kind, table, pad, backlogHeaderStyle]);

  const tab = TABS.find((item) => item.value === kind)!;

  const handleCopy = async () => {
    const ok = await copyToClipboard(output);
    setCopied(ok ? `${tab.label} をコピーしました。` : 'コピーできませんでした。');
    window.setTimeout(() => setCopied(null), 2500);
  };

  /** 表そのものを他アプリへ貼り付けたいとき用に、HTML と TSV を同時に載せる。 */
  const handleCopyAsTable = async () => {
    const ok = await copyToClipboard(toTsv(table), toHtml(table));
    setCopied(ok ? '表としてコピーしました（Excel 等に貼り付け可）。' : 'コピーできませんでした。');
    window.setTimeout(() => setCopied(null), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: `${tab.mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `table.${tab.ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const supportsPad = kind === 'markdown' || kind === 'backlog';

  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">変換結果</h2>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={kind === item.value}
            className={`tab${kind === item.value ? ' tab--on' : ''}`}
            onClick={() => setKind(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar">
        {supportsPad && (
          <label className="field field--check">
            <input type="checkbox" checked={pad} onChange={(e) => setPad(e.target.checked)} />
            列幅をそろえる
          </label>
        )}
        {kind === 'backlog' && (
          <label className="field">
            見出し行
            <select
              value={backlogHeaderStyle}
              onChange={(e) => setBacklogHeaderStyle(e.target.value as 'suffix' | 'tilde')}
            >
              <option value="suffix">行末に h（| a | b |h）</option>
              <option value="tilde">セル頭に ~（|~a|~b|）</option>
            </select>
          </label>
        )}
        <span className="spacer" />
        <button type="button" onClick={handleDownload}>
          ダウンロード
        </button>
        <button type="button" onClick={handleCopyAsTable}>
          表としてコピー
        </button>
        <button type="button" className="primary" onClick={handleCopy}>
          コピー
        </button>
      </div>

      <textarea className="output__text" value={output} readOnly spellCheck={false} />

      <p className="panel__message" role="status">
        {copied ?? `${output.split('\n').length} 行 / ${output.length} 文字`}
      </p>
    </section>
  );
}
