import { beforeAll, describe, expect, it } from 'vitest';
import HOST_PATTERNS from './hosts.json';

interface CreatedMenu {
  id?: string;
  title?: string;
  contexts?: string[];
  documentUrlPatterns?: string[];
}

const created: CreatedMenu[] = [];

beforeAll(async () => {
  // background.ts は読み込んだ時点でリスナを登録するので、先に chrome を用意しておく。
  // onInstalled はその場で呼び、メニューの組み立てを走らせる。
  (globalThis as unknown as { chrome: unknown }).chrome = {
    contextMenus: {
      removeAll: (done: () => void) => done(),
      create: (props: CreatedMenu) => created.push(props),
      onClicked: { addListener: () => {} },
    },
    runtime: {
      onInstalled: { addListener: (fn: () => void) => fn() },
      onStartup: { addListener: () => {} },
    },
    tabs: { sendMessage: () => Promise.resolve() },
  };
  await import('./background');
});

describe('右クリックメニュー', () => {
  it('項目を組み立てる', () => {
    expect(created.map((menu) => menu.id)).toEqual(['edit-table', 'convert-table']);
  });

  it('すべての項目を対象ドメインに限定する', () => {
    // メニューはサービスワーカーが全サイト共通で作るため、documentUrlPatterns を
    // 付け忘れるとコンテンツスクリプトが動かないサイトにも項目が出てしまう。
    for (const menu of created) {
      expect(menu.documentUrlPatterns, `${menu.id} に documentUrlPatterns が無い`).toEqual(
        HOST_PATTERNS,
      );
    }
  });

  it('対象ドメインは Backlog だけ', () => {
    expect(HOST_PATTERNS.length).toBeGreaterThan(0);
    for (const pattern of HOST_PATTERNS) {
      expect(pattern).toMatch(/^https:\/\/\*\.backlog(\.com|\.jp|tool\.com)\/\*$/);
    }
  });

  it('編集の項目は入力欄の上だけに出す', () => {
    expect(created[0].contexts).toEqual(['editable']);
  });

  it('変換の項目は入力欄を除いた場所に出す', () => {
    expect(created[1].contexts).not.toContain('editable');
    expect(created[1].contexts).toContain('page');
  });
});
