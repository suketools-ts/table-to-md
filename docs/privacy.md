# プライバシーポリシー / Privacy Policy

**表エディタ for Backlog**（Chrome / Edge 拡張機能）

提供者: tera（個人開発者） / Provider: tera (individual developer)

最終更新日 / Last updated: 2026-09-21

---

## 日本語

### 収集する情報

**この拡張機能は、利用者のいかなる情報も収集・保存・送信しません。**

外部のサーバーとの通信を一切行いません。解析ツール、広告、トラッキングの類も
組み込んでいません。

### 拡張機能が扱う情報

機能の実行中に、次の情報をブラウザ内でのみ扱います。いずれも処理が終わればその場で
破棄され、どこにも保存されません。

| 扱う情報 | 目的 | 範囲 |
| --- | --- | --- |
| Backlog のページに表示されている表の内容 | Markdown / Backlog 記法のソースに変換するため | 利用者が右クリックした表のみ |
| Backlog の入力欄（コメント欄・説明欄）のテキスト | カーソル位置の表を読み取り、編集結果を書き戻すため | 利用者が右クリックした入力欄のみ |
| クリップボード | 変換したソースを利用者の操作でコピーするため | 利用者が「コピー」を押したときのみ書き込み |

いずれも、利用者が右クリックメニューから明示的に操作したときにのみ動作します。

### 権限について

| 権限 | 用途 |
| --- | --- |
| `contextMenus` | 右クリックメニューに項目を追加するため |
| `clipboardWrite` | 変換したソースをクリップボードへ書き込むため |
| `https://*.backlog.com/*`<br>`https://*.backlog.jp/*`<br>`https://*.backlogtool.com/*` | Backlog のページ上でのみ動作させるため。これ以外のサイトでは一切動作しません |

### 第三者への提供

情報を収集していないため、第三者への提供もありません。

### お問い合わせ

提供者: tera（個人開発者）

https://github.com/nsc-tera1234/table-to-md/issues

### 免責

この拡張機能は個人が開発したものであり、株式会社ヌーラボおよび Backlog の
公式製品ではありません。

---

## English

### Information we collect

**This extension does not collect, store, or transmit any user information.**

It makes no network requests to any server. It contains no analytics, advertising,
or tracking code of any kind.

### Information the extension handles

While a feature is running, the following is handled **locally in the browser only**
and is discarded as soon as the operation finishes. Nothing is persisted.

| Data | Purpose | Scope |
| --- | --- | --- |
| Content of a table rendered on a Backlog page | To convert it into Markdown / Backlog notation | Only the table the user right-clicked |
| Text in a Backlog input field (comment or description) | To read the table at the caret and write the edited result back | Only the field the user right-clicked |
| Clipboard | To copy the converted source when the user asks for it | Written only when the user presses "Copy" |

All of the above happens only in response to an explicit action from the context menu.

### Permissions

| Permission | Why it is needed |
| --- | --- |
| `contextMenus` | To add items to the browser's right-click menu |
| `clipboardWrite` | To place converted text on the clipboard |
| `https://*.backlog.com/*`<br>`https://*.backlog.jp/*`<br>`https://*.backlogtool.com/*` | To run only on Backlog pages. The extension does not run on any other site |

### Sharing with third parties

No data is collected, so none is shared.

### Contact

Provider: tera (individual developer)

https://github.com/nsc-tera1234/table-to-md/issues

### Disclaimer

This extension is developed independently and is **not** an official product of
Nulab Inc. or Backlog.
