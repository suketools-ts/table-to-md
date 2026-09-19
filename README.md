# 表 ⇄ Markdown / Backlog 記法 変換ツール

表計算のように編集できるグリッドで表を作り、**Markdown** と **Backlog 記法**
（および CSV / TSV / HTML）に変換するツールです。逆に、ブラウザ上でコピーした表・
Excel からの貼り付け・CSV / TSV・Markdown・Backlog 記法を **表へ取り込む** こともできます。

React + TypeScript + Vite で動く、サーバー不要のクライアントアプリです。
表のコンポーネントには [react-masume-grid](https://github.com/t92345era/react-masume-grid) を使用しています。

## 使い方

```sh
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド（dist/ に出力）
npm run preview  # ビルド結果の確認
npm test         # ロジックのテスト
```

## 機能

### 表 → テキスト（変換結果パネル）

| 出力形式 | 内容 |
| --- | --- |
| Markdown | GitHub Flavored Markdown の表。列の寄せを区切り行（`:---` / `:---:` / `---:`）に反映 |
| Backlog 記法 | 見出し行は行末 `h`（`\| a \| b \|h`）またはセル頭 `~`（`\|~a\|~b\|`）を選択可能 |
| CSV / TSV | RFC 4180 準拠。区切り文字・改行・`"` を含むセルは自動でクォート |
| HTML | `<table>`。`thead` と `text-align` を出力 |

- **列幅をそろえる**: 全角文字を 2 桁として数えて桁を揃えるため、等幅フォントで列が揃います。
- **コピー**: 変換したテキストをクリップボードへ。
- **表としてコピー**: `text/html` と TSV を同時にクリップボードへ載せるので、Excel や
  Google スプレッドシート、リッチテキストエディタに「表のまま」貼り付けられます。
- **ダウンロード**: `.md` / `.txt` / `.csv` / `.tsv` / `.html` として保存。

### テキスト → 表（取り込みパネル）

貼り付けるだけで形式を自動判定します（HTML → Backlog → Markdown → TSV/CSV の順に判定）。
形式を明示的に選ぶこともできます。

- **ブラウザの表**: Web ページ上の表を選択してコピーするとクリップボードに `text/html` が入ります。
  貼り付け時にそれを拾い、見た目どおりの列構成で取り込みます。`colspan` / `rowspan` は
  結合元の値を複製して展開します（Markdown・Backlog 記法はセル結合を表現できないため）。
- **Excel / Google スプレッドシート**: TSV として取り込みます。セル内の改行やタブも保持します。
- **CSV / TSV**: クォート内の区切り文字・改行・`""` エスケープを解釈します。区切り文字
  （タブ / カンマ / セミコロン）は行ごとの列数の揃い方から推定します。
- **Markdown / Backlog 記法**: 既存の表を読み戻して編集できます。Markdown は区切り行から
  列の寄せも復元します。
- **ファイル読み込み**: `.csv` / `.tsv` / `.md` / `.txt` を選択して読み込めます。
- 「表に反映」で置き換え、「下に追加」で既存の表の下に行を足します。

### 表の編集

- セルをダブルクリック（または直接入力）で編集。日本語 IME に対応しています。
- 範囲選択して Ctrl+C / Ctrl+V。グリッド内の貼り付けでも行・列が自動で広がります。
- 行・列の挿入 / 削除、行列入替、空白整理（各セルの前後の空白を削除）、
  空行除去（末尾の空行・空列を削除）。
- 1 行目を見出しにするかの切り替え。
- 列ごとの寄せ指定（Markdown の出力に反映）。
- Ctrl+Z / Ctrl+Shift+Z で元に戻す・やり直す。

## セルに含まれる特殊文字の扱い

区切り文字そのものをセルに含められるよう、形式ごとにエスケープします。
どの形式でも「変換 → 取り込み」で元の値に戻ることをテストで確認しています。

| 文字 | Markdown | Backlog 記法 | CSV / TSV |
| --- | --- | --- | --- |
| `\|` | `\\\|` | `&#124;` | クォート不要 |
| 改行 | `<br>` | `&br;` | セル全体をクォート |
| `"` | そのまま | そのまま | `""` に重ねてクォート |

## 構成

```
src/
  lib/                  変換ロジック（UI に依存しない・単体テスト済み）
    types.ts            表のモデルと共通ユーティリティ
    table-ops.ts        行・列の挿入 / 削除、転置、整形
    table-block.ts      ソース中の表の範囲を探す / 挿入時の改行を整える
    clipboard.ts        クリップボードの読み書き
    useTableHistory.ts  元に戻す / やり直す
    parse/              テキスト → 表（html / markdown / backlog / delimited と形式判定）
    format/             表 → テキスト（markdown / backlog / delimited / html と表示幅計算）
  components/           Web アプリと拡張機能で共有
    TableGrid.tsx       編集グリッド（react-masume-grid のラッパー）
    AlignmentBar.tsx    列ごとの寄せ指定
  web/                  Web アプリ
    App.tsx / main.tsx / styles.css
    components/         ImportPanel（取り込み）, OutputPanel（変換結果）
  extension/            Chrome / Edge 拡張機能（README はこの下）
```

変換ロジックは `src/lib` に閉じていて UI に依存しません（`*.test.ts` で単体テスト済み）。
Web アプリと拡張機能はこの層と `src/components` を共有しています。

## Chrome / Edge 拡張機能

Backlog の課題編集画面で、入力欄を右クリックして表を編集・挿入したり、既存のコメントに
書かれた表を右クリックして Markdown / Backlog 記法のソースに起こし直したりできる
拡張機能も同梱しています。

```sh
npm run build:extension   # dist-extension/ に出力し、ブラウザから読み込む
```

詳細は [`src/extension/README.md`](src/extension/README.md) を参照してください。
