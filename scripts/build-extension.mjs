/**
 * 拡張機能を dist-extension/ に組み立てる。
 *
 * コンテンツスクリプトとサービスワーカーは読み込まれ方が違うので、別々にビルドする。
 * - コンテンツスクリプト: ページに直接差し込まれる古典スクリプト。import を残せないので
 *   IIFE の 1 ファイルにまとめる。
 * - サービスワーカー: manifest で type: module を指定しているので ES モジュールでよい。
 */
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../dist-extension', import.meta.url));

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

/** @param {{ entry: string, name: string, format: 'iife' | 'es' }} options */
const bundle = ({ entry, name, format }) =>
  build({
    root,
    configFile: false,
    // public/ は Web アプリ用。拡張機能の出力に紛れ込ませない。
    publicDir: false,
    plugins: [react()],
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      outDir,
      emptyOutDir: false,
      // CSS は ?inline で JS に取り込んでいるため、別ファイルとしては出さない。
      cssCodeSplit: false,
      lib: { entry, name, formats: [format], fileName: () => `${name}.js` },
    },
  });

await bundle({ entry: 'src/extension/content/index.ts', name: 'content', format: 'iife' });
await bundle({ entry: 'src/extension/background.ts', name: 'background', format: 'es' });

// 対象ドメインは hosts.json だけが持つ。manifest とメニューの条件がずれると
// 「コンテンツスクリプトが動かないサイトにメニューが出る」といった食い違いが起きるため。
const manifest = JSON.parse(await readFile('src/extension/manifest.json', 'utf8'));
const hosts = JSON.parse(await readFile('src/extension/hosts.json', 'utf8'));
delete manifest._comment;
manifest.host_permissions = hosts;
manifest.content_scripts[0].matches = hosts;
await writeFile(`${outDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

await import('./make-icon.mjs');
console.log('dist-extension/ に拡張機能を出力しました');
