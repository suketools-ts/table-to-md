// Backlog のコメント欄と同じ構成（ProseMirror の contenteditable、1 行 = 1 つの <p>）を
// 本物の ProseMirror で再現する。拡張機能の読み取り・書き戻しがこの構成で動くかを確かめるため。
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
    text: { group: 'inline' },
  },
});

const lines = [
  'テスト文書',
  '',
  '|header1|header2|header3|h',
  '|col1|col2|col3|',
  '|col1|col2|col3|',
];

const doc = schema.node(
  'doc',
  null,
  lines.map((line) =>
    schema.node('paragraph', null, line === '' ? [] : [schema.text(line)]),
  ),
);

const view = new EditorView(document.querySelector('#pm-mount'), {
  state: EditorState.create({ doc, schema }),
});
// Backlog と同じクラス・属性を載せる。
view.dom.id = 'leftCommentContent';
view.dom.className = 'comment-editor__textarea hotkey-ignore ProseMirror';
view.dom.setAttribute('data-testid', 'textEditor');
view.dom.setAttribute('role', 'textbox');
view.dom.setAttribute('translate', 'no');

window.__pm = view;
/** ProseMirror の内部状態から見たソーステキスト（期待値の突き合わせ用）。 */
window.__pmText = () => view.state.doc.content.content.map((n) => n.textContent).join('\n');
