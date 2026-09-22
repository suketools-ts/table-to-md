import { describe, expect, it } from 'vitest';
import manifest from './manifest.json';
import HOST_PATTERNS from './hosts.json';

describe('manifest.json', () => {
  it('対象ドメインを持たない（ビルド時に hosts.json から流し込む）', () => {
    // 2 か所に書くとズレるので、雛形側は空にしてある。
    expect(manifest.host_permissions).toEqual([]);
    expect(manifest.content_scripts[0].matches).toEqual([]);
  });

  it('hosts.json に対象ドメインがある', () => {
    expect(HOST_PATTERNS).not.toHaveLength(0);
  });

  it('コンテンツスクリプトと拡張機能の権限を同じ一覧から作る', () => {
    // manifest を組み立てるのはビルド側なので、ここでは雛形の形だけを押さえる。
    expect(manifest.content_scripts).toHaveLength(1);
    expect(manifest.content_scripts[0].js).toEqual(['content.js']);
  });
});
