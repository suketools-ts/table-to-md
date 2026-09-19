/**
 * 動作確認用ページが使う ProseMirror を束ねる。
 * Backlog のコメント欄と同じ構成を本物の ProseMirror で再現するため。
 */
import { build } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

await build({
  root,
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  build: {
    outDir: 'extension-test',
    emptyOutDir: false,
    lib: {
      entry: 'extension-test/prosemirror-setup.mjs',
      name: 'pm',
      formats: ['es'],
      fileName: () => 'prosemirror-bundle.js',
    },
  },
});
console.log('extension-test/prosemirror-bundle.js を生成しました');
