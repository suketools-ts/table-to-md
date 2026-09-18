import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent } from 'react';
import type { InputFormat, ParsedTable } from '../../lib/types';
import { detectFormat, parseTable } from '../../lib/parse';
import { readClipboard } from '../../lib/clipboard';

interface Props {
  onApply: (table: ParsedTable, mode: 'replace' | 'append') => void;
}

const FORMATS: Array<{ value: InputFormat; label: string }> = [
  { value: 'auto', label: '自動判定' },
  { value: 'html', label: 'HTML の表' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'backlog', label: 'Backlog 記法' },
  { value: 'csv', label: 'CSV' },
  { value: 'tsv', label: 'TSV' },
];

const FORMAT_LABEL: Record<Exclude<InputFormat, 'auto'>, string> = {
  html: 'HTML の表',
  markdown: 'Markdown',
  backlog: 'Backlog 記法',
  csv: 'CSV',
  tsv: 'TSV',
};

/**
 * 貼り付け・CSV/TSV ファイル・手入力から表を取り込むパネル。
 *
 * ブラウザ上の表をコピーするとクリップボードには `text/html` が入る。貼り付け時に
 * それを拾えた場合は、見た目どおりの列構成で取り込めるよう HTML の方を優先する。
 */
export function ImportPanel({ onApply }: Props) {
  const [text, setText] = useState('');
  const [format, setFormat] = useState<InputFormat>('auto');
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // 貼り付けで受け取った HTML。テキストを手で編集したら破棄する。
  const [pastedHtml, setPastedHtml] = useState<string | null>(null);
  // 見出し行の有無の手動指定。null なら判定結果に従う。
  const [headerOverride, setHeaderOverride] = useState<boolean | null>(null);

  const source = pastedHtml ?? text;
  const effectiveFormat: InputFormat = pastedHtml && format === 'auto' ? 'html' : format;

  const preview = useMemo(() => {
    if (source.trim() === '') return null;
    const { table, format: resolved } = parseTable(source, effectiveFormat);
    const cols = table.rows.reduce((max, row) => Math.max(max, row.length), 0);
    return { table, resolved, rows: table.rows.length, cols };
  }, [source, effectiveFormat]);

  // CSV/TSV には見出し行の目印が無いため判定は当て推量になる。取り込み前に見せて直せるようにする。
  const hasHeader = headerOverride ?? preview?.table.hasHeader ?? true;

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    setHeaderOverride(null);
    const html = event.clipboardData.getData('text/html');
    const plain = event.clipboardData.getData('text/plain');
    if (html && /<table[\s>]/i.test(html)) {
      event.preventDefault();
      setPastedHtml(html);
      setText(plain || '(ブラウザの表を HTML として取り込みました)');
      setMessage('ブラウザの表を HTML として受け取りました。');
      return;
    }
    setPastedHtml(null);
    setMessage(null);
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setPastedHtml(null);
    setHeaderOverride(null);
    setMessage(null);
    setText(event.target.value);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setPastedHtml(null);
    setHeaderOverride(null);
    setText(content);
    setFormat(file.name.toLowerCase().endsWith('.tsv') ? 'tsv' : 'auto');
    setMessage(`${file.name} を読み込みました。`);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleReadClipboard = async () => {
    setHeaderOverride(null);
    const data = await readClipboard();
    if (!data) {
      setMessage('クリップボードを読み取れませんでした。下の欄に Ctrl+V で貼り付けてください。');
      return;
    }
    if (data.html && /<table[\s>]/i.test(data.html)) {
      setPastedHtml(data.html);
      setText(data.text || '(ブラウザの表を HTML として取り込みました)');
      setMessage('クリップボードの表を HTML として受け取りました。');
      return;
    }
    setPastedHtml(null);
    setText(data.text);
    setMessage(`クリップボードから読み込みました（${FORMAT_LABEL[detectFormat(data.text)]}）。`);
  };

  const apply = (mode: 'replace' | 'append') => {
    if (!preview) return;
    onApply({ ...preview.table, hasHeader }, mode);
    // 「下に追加」では見出し行は足されないので、実際に増える行数を伝える。
    const added = hasHeader ? preview.rows - 1 : preview.rows;
    setMessage(
      mode === 'replace'
        ? `${FORMAT_LABEL[preview.resolved]} として反映しました（${preview.rows} 行 × ${preview.cols} 列）。`
        : `${FORMAT_LABEL[preview.resolved]} から ${added} 行を追加しました。`,
    );
  };

  const clear = () => {
    setText('');
    setPastedHtml(null);
    setHeaderOverride(null);
    setMessage(null);
  };

  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">取り込み</h2>
        <p className="panel__note">
          ブラウザの表・Excel・CSV/TSV・Markdown・Backlog 記法を貼り付けると表に戻せます。
        </p>
      </header>

      <div className="toolbar">
        <label className="field">
          形式
          <select
            value={format}
            onChange={(event) => {
              setHeaderOverride(null);
              setFormat(event.target.value as InputFormat);
            }}
          >
            {FORMATS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={handleReadClipboard}>
          クリップボードから読み込む
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          ファイルを選択
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,.md,text/csv,text/plain"
          hidden
          onChange={handleFile}
        />
      </div>

      <textarea
        className="import__text"
        value={text}
        onPaste={handlePaste}
        onChange={handleChange}
        spellCheck={false}
        placeholder={
          'ここに貼り付け（Ctrl+V / ⌘+V）\n\n例:\n| 商品 | 価格 |\n| --- | ---: |\n| りんご | 100 |'
        }
      />

      <div className="toolbar toolbar--end">
        {preview ? (
          <span className="badge">
            {FORMAT_LABEL[preview.resolved]} / {preview.rows} 行 × {preview.cols} 列
          </span>
        ) : (
          <span className="badge badge--muted">入力待ち</span>
        )}
        <label className="field field--check">
          <input
            type="checkbox"
            checked={hasHeader}
            disabled={!preview}
            onChange={(event) => setHeaderOverride(event.target.checked)}
          />
          1 行目は見出し
        </label>
        <span className="spacer" />
        <button type="button" onClick={clear} disabled={source.trim() === ''}>
          クリア
        </button>
        <button type="button" onClick={() => apply('append')} disabled={!preview}>
          下に追加
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => apply('replace')}
          disabled={!preview}
        >
          表に反映
        </button>
      </div>

      {message && <p className="panel__message">{message}</p>}
    </section>
  );
}
