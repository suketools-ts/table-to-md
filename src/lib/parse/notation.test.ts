import { describe, expect, it } from 'vitest';
import { detectNotation, parseNotation } from './notation';

describe('detectNotation', () => {
  it('行末の h から Backlog 記法と判定する', () => {
    expect(detectNotation('| a | b |h\n| 1 | 2 |')).toBe('backlog');
  });

  it('セル頭の ~ から Backlog 記法と判定する', () => {
    expect(detectNotation('|~a|~b|\n|1|2|')).toBe('backlog');
  });

  it('&br; から Backlog 記法と判定する', () => {
    expect(detectNotation('| a |\n| x&br;y |')).toBe('backlog');
  });

  it('区切り行から Markdown と判定する', () => {
    expect(detectNotation('| a | b |\n| --- | --- |\n| 1 | 2 |')).toBe('markdown');
  });

  it('寄せ付きの区切り行も Markdown と判定する', () => {
    expect(detectNotation('| a | b |\n| :--- | ---: |\n| 1 | 2 |')).toBe('markdown');
  });

  it('目印が無ければ fallback を返す', () => {
    expect(detectNotation('| a | b |\n| 1 | 2 |')).toBe('backlog');
    expect(detectNotation('| a | b |\n| 1 | 2 |', 'markdown')).toBe('markdown');
  });

  it('両方の目印があれば判断できないので fallback を返す', () => {
    expect(detectNotation('| a |h\n| --- |\n| 1 |', 'markdown')).toBe('markdown');
  });

  it('本文中の水平線を区切り行と取り違えない', () => {
    expect(detectNotation('前置き\n\n| a | b |h\n| 1 | 2 |')).toBe('backlog');
  });
});

describe('parseNotation', () => {
  it('指定した記法で読む', () => {
    expect(parseNotation('| a | b |h\n| 1 | 2 |', 'backlog').hasHeader).toBe(true);
    expect(parseNotation('| a | b |\n| --- | --- |\n| 1 | 2 |', 'markdown').aligns).toHaveLength(2);
  });
});

describe('水平線との取り違え', () => {
  it('Backlog 記法の文書に水平線があっても Backlog と判定する', () => {
    expect(detectNotation('| a | b |h\n| 1 | 2 |\n\n----\n\nあとがき')).toBe('backlog');
  });

  it('水平線だけでは Markdown と判定しない', () => {
    expect(detectNotation('見出し\n----\n本文', 'backlog')).toBe('backlog');
  });
});
