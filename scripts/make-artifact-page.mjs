/**
 * dist/index.html から Artifact 公開用の dist/artifact.html を作る。
 *
 * Artifact は公開時にページを <!doctype>…<head>…<body> の骨組みで包むため、
 * 自前の doctype / html / head / body タグは持たせられない。<head> の中身と
 * #root だけを残した断片に組み替える。アセットは同じ Artifact 内の
 * 相対パスで配信されるので、参照はビルド結果のまま使える。
 */
import { readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const html = await readFile(new URL('index.html', dist), 'utf8');

const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1];
if (!head || !body) throw new Error('dist/index.html から head / body を取り出せませんでした');

const page = [
  head
    .split('\n')
    // charset と viewport は Artifact の骨組みが持っている。
    // タブのアイコンは公開時の icon 指定で付くので favicon の link も要らない。
    .filter((line) => !/<meta\s+charset|name="viewport"|rel="icon"/i.test(line))
    // 同一オリジンで配信されるので crossorigin は不要。相対パスは先頭の ./ を外す。
    .map((line) => line.replace(/\s+crossorigin/g, '').replace(/(href|src)="\.\//g, '$1="'))
    .map((line) => line.replace(/^ {4}/, ''))
    .join('\n')
    .trim(),
  body.trim(),
].join('\n\n');

await writeFile(new URL('artifact.html', dist), `${page}\n`, 'utf8');
console.log('dist/artifact.html を生成しました');
