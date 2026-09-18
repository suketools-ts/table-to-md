# Backlog 表エディタ（Chrome / Edge 拡張機能）

Backlog の課題編集画面で、表を表計算のように編集するための拡張機能です。
Manifest V3 で作っているので、同じパッケージが Chrome と Edge の両方で動きます。

変換ロジックは Web アプリ版と同じ `src/lib` をそのまま使っています。

## できること

### ① 入力欄で右クリック →「カーソル位置の表を編集 / 新規作成」

入力欄（`<textarea>` または contenteditable）の上でだけメニューが出ます。

- カーソルが表の上にあれば、その表を読み込んでグリッドで編集し、元の範囲を置き換えます。
- 表の上に無ければ、空の表を作ってカーソル位置に挿入します。前後の地の文とくっついて
  誤解釈されないよう、空行で挟みます。

**記法は自動判定します。** 見出し行の `|h`、セル頭の `~`、セル内改行の `&br;` があれば
Backlog 記法、区切り行（`| --- |`）があれば Markdown と判断します。新規作成のときは
表そのものが無いので、入力欄全体の書きぶりから推定します。判定結果は画面下部に
表示され、必要なら手動で変えられます。

### ② 表示中の表を範囲選択して右クリック →「Markdown / Backlog 記法でコピー」

**記法は 2 つのメニュー項目として並ぶので、その場で選べます。**

表の一部だけをドラッグしていても表全体を対象にします（半端な行だけ取り出しても
使い道が無いため）。`colspan` / `rowspan` は結合元の値を複製して展開します。

## ビルドと読み込み

```sh
npm run build:extension   # dist-extension/ に出力
```

1. Chrome / Edge で `chrome://extensions`（Edge は `edge://extensions`）を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」で `dist-extension/` を選ぶ

コードを変えたら `npm run build:extension` をやり直し、拡張機能一覧の再読み込みボタンを押します。

## 対象ドメイン

`*.backlog.com` / `*.backlog.jp` / `*.backlogtool.com` を対象にしています。
別のドメインで使う場合は `src/extension/manifest.json` の `host_permissions` と
`content_scripts.matches` に足してください。

## 動作確認用のページ

`extension-test/fixture.html` は Backlog の編集画面を模した検証用ページです。
`chrome` API を最小限だけ模倣していて、拡張機能を読み込まなくても
コンソールから `__send({ type: 'edit-table' })` などで動作を試せます。

```sh
npm run build:extension
# ブラウザで extension-test/fixture.html を開く
```

## 構成

| ファイル | 役割 |
| --- | --- |
| `manifest.json` | 拡張機能の定義（権限・対象ドメイン・スクリプトの登録） |
| `background.ts` | サービスワーカー。右クリックメニューを作り、指示を送る |
| `messages.ts` | バックグラウンドとコンテンツスクリプトの間の型定義 |
| `content/index.ts` | コンテンツスクリプト本体。右クリック位置を控え、指示を処理する |
| `content/editable.ts` | `<textarea>` と contenteditable の差を吸収する層 |
| `content/selection.ts` | 選択範囲にかかっている `<table>` を拾う |
| `content/overlay.tsx` | Shadow DOM に編集画面を立てる |
| `content/TableEditor.tsx` | 編集画面の中身 |

## 実装上の要点

**右クリックした要素の特定** — メニューのクリックはサービスワーカー側に届きますが、
どの要素を右クリックしたかは分かりません。コンテンツスクリプト側で `contextmenu` を
capture 段階で拾い、対象の要素とカーソル位置を控えています。

**入力欄への書き戻し** — `document.execCommand('insertText')` を第一手にしています。
古い API ですが、ページ側の取り消し履歴（Ctrl+Z）を保ったまま挿入でき、`input` イベントも
発生する唯一の手段です。使えない場合は、`value` のプロトタイプ setter を通してから
`input` を発火させる経路に落ちます（React などが値を監視している場合に変更を拾わせるため）。

**画面の隔離** — 編集画面は Shadow DOM の中に立てています。ページ側の CSS を持ち込まず、
こちらの CSS も外へ漏らしません。スタイルは `?inline` で文字列として取り込み、
シャドウルート内に閉じ込めています。

**クリップボード** — 右クリックメニュー経由だとユーザー操作の引き継ぎが切れて
`navigator.clipboard` が拒否されることがあります。共有している `src/lib/clipboard.ts` が
`execCommand('copy')` に落ちる作りなので、そのまま効きます。
