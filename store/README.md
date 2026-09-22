# ストア公開用の資料

Chrome ウェブストアと Microsoft Edge アドオンに提出するときの、そのまま貼れる文面と
チェックリスト。実際の入力欄の名称はダッシュボードの更新で変わることがあるので、
画面の指示が優先です。

## 提出前チェックリスト

- [ ] `npm run build:extension` を実行し、`dist-extension/` を更新した
- [ ] `src/extension/manifest.json` の `version` を上げた（更新時は必須）
- [ ] zip を作った（下記）
- [ ] スクリーンショットを**実際の Backlog 画面で**撮り直した（`screenshots/` のものは検証用ページで撮ったもの）
- [ ] プライバシーポリシーの URL が開けることを確認した
- [ ] 公開者名が LICENSE・プライバシーポリシーと一致している（`tera`）

## zip の作り方

両ストアとも `manifest.json` が **zip のルート**にある必要があります。

```sh
npm run build:extension
cd dist-extension && zip -r ../backlog-table-editor-$(node -p "require('../src/extension/manifest.json').version").zip . && cd ..
```

## ストア表示名

```
表エディタ for Backlog
```

ヌーラボ社の公式製品と誤解されないよう、「Backlog 〜」ではなく「〜 for Backlog」の形に
しています。あわせて説明文の冒頭で非公式であることを明記しています。

## 公開者名（提供元 / 発行元）

```
tera
```

LICENSE の著作権者、プライバシーポリシーの提供者、ストアの公開者名はすべて `tera` で
揃えています。審査ではプライバシーポリシーの URL を開いて突き合わせられるので、
どれか 1 つだけ変えないでください。

**取引者（trader）の申告は「非取引者」を選びます。** 無償で提供し、収益化も
していないためです。取引者として申告すると、EU の規則にもとづき氏名・住所・
メール・電話が公開されます。将来有償化する場合はこの申告を見直してください。

## 短い説明（manifest の description と同じ）

```
Backlog の入力欄で表を表計算のように編集し、表示中の表を Markdown / Backlog 記法に変換します。ヌーラボ社の公式製品ではありません。
```

## 詳細説明

```
※ この拡張機能は個人が開発したものであり、株式会社ヌーラボおよび Backlog の公式製品ではありません。

Backlog の表を、表計算ソフトのように編集できるようにする拡張機能です。

■ 入力欄で右クリック →「カーソル位置の表を編集 / 新規作成」
コメント欄や説明欄で右クリックすると、カーソル位置にある表をグリッドで編集できます。
行・列の挿入や削除、行列の入れ替え、セルの範囲コピー＆ペースト、元に戻す／やり直しに
対応しています。表が無い位置なら、新しい表を作って挿入します。

記法（Backlog 記法 / Markdown）は元のソースから自動判定します。判定できないときは
Backlog 記法を選び、必要ならその場で切り替えられます。

■ 表示中の表で右クリック →「この表を Markdown / Backlog 記法に変換」
すでに投稿されているコメントや説明に書かれた表を、ソースに起こし直せます。範囲選択は
不要で、表のセルの上で右クリックするだけです。記法を切り替えながら中身を確かめて
コピーできます。

■ その他
・列幅をそろえて出力できます（全角文字を 2 桁として数えます）
・セルに区切り文字や改行が含まれていても、記法ごとに正しくエスケープします
・外部のサーバーとは一切通信しません。すべてブラウザ内で処理します

■ 対応サイト
backlog.com / backlog.jp / backlogtool.com

■ ソースコードとお問い合わせ
https://github.com/suketools-ts/table-to-md
```

## カテゴリ

「仕事効率化」（Productivity / Workflow & Planning）

## 単一用途の説明（Chrome の「単一用途」欄）

```
Backlog の表と、そのソース記法（Backlog 記法 / Markdown）を相互に変換することが単一の
目的です。入力欄にある表をグリッドで編集して書き戻す機能と、表示中の表をソースに
起こす機能はいずれもこの目的の表と裏であり、他の用途は持ちません。
```

English:

```
The single purpose of this extension is converting between tables on Backlog and their
source notation (Backlog notation / Markdown). Editing a table from an input field in a
grid and converting a rendered table back into source are two directions of that same
purpose; the extension does nothing else.
```

## 権限の使用理由

| 権限 | 理由（そのまま貼れます） |
| --- | --- |
| `contextMenus` | 右クリックメニューに「カーソル位置の表を編集 / 新規作成」と「この表を Markdown / Backlog 記法に変換」の 2 項目を追加するために必要です。この拡張機能はツールバーの UI を持たず、右クリックメニューが唯一の入口です。 |
| `clipboardWrite` | 変換したソーステキストを、利用者が「コピー」を押したときにクリップボードへ書き込むために必要です。読み取りは行いません。 |
| ホスト権限 | Backlog のページ上で、入力欄のテキストと表示中の表の内容を読み書きするために必要です。対象を `backlog.com` / `backlog.jp` / `backlogtool.com` に限定しており、他のサイトでは一切動作しません。 |

English:

```
contextMenus: Required to add the two menu items that are the only entry points to this
extension ("Edit the table at the caret" and "Convert this table to Markdown / Backlog
notation"). The extension has no toolbar UI.

clipboardWrite: Required to place the converted source text on the clipboard when the
user presses the Copy button. The extension never reads the clipboard.

Host permissions: Required to read the text of an input field and the content of a
rendered table on Backlog pages, and to write the edited result back. Scoped to
backlog.com / backlog.jp / backlogtool.com only; the extension does not run anywhere else.
```

## データ利用の申告

すべて「収集しない」で申告します。実際に外部通信のコードを持たず、ビルド成果物にも
`fetch` / `XMLHttpRequest` / 動的 `import` は含まれません。

| 項目 | 回答 |
| --- | --- |
| 個人を特定できる情報 | 収集しない |
| 健康情報・金融情報・認証情報 | 収集しない |
| 個人的な連絡先・位置情報 | 収集しない |
| ウェブ閲覧履歴・ユーザーの活動 | 収集しない |
| ウェブサイトのコンテンツ | 収集しない（ページ内で処理するのみで、保存も送信もしない） |
| 第三者への販売・譲渡 | しない |
| 承認された用途以外での利用 | しない |
| 信用調査等での利用 | しない |

## プライバシーポリシー URL

リポジトリの [`docs/privacy.md`](../docs/privacy.md) が本文です。次のどちらかを指定します。

- GitHub Pages を `/docs` で有効にした場合: `https://suketools-ts.github.io/table-to-md/privacy.html`
- Pages を使わない場合: `https://github.com/suketools-ts/table-to-md/blob/<公開ブランチ>/docs/privacy.md`

## 画像

| 用途 | サイズ | 置き場所 |
| --- | --- | --- |
| 拡張機能のアイコン | 16 / 32 / 48 / 128 px | `dist-extension/icon*.png`（ビルドで生成） |
| ストアのスクリーンショット | 1280×800 | `screenshots/` |

ストアロゴ（Chrome 128×128、Edge は別サイズ）は `dist-extension/icon128.png` を使うか、
ダッシュボードの指示に合わせて用意してください。

**`screenshots/` の画像は `extension-test/` の検証用ページで撮ったものです。**
そのまま出すこともできますが、実際の Backlog の画面で撮り直したほうが伝わります。
