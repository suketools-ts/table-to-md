import { describe, expect, it } from 'vitest';
import { toMarkdown } from './markdown';
import type { TableModel } from '../types';

const base: TableModel = {
  rows: [
    ['Name', 'Qty'],
    ['Apple', '10'],
  ],
  hasHeader: true,
  aligns: [],
};

describe('toMarkdown', () => {
  it('列幅をそろえて出力する', () => {
    expect(toMarkdown(base)).toBe(
      ['| Name  | Qty |', '| ----- | --- |', '| Apple | 10  |'].join('\n'),
    );
  });

  it('pad を切ると余白を入れない', () => {
    expect(toMarkdown(base, { pad: false })).toBe(
      ['| Name | Qty |', '| --- | --- |', '| Apple | 10 |'].join('\n'),
    );
  });

  it('寄せを区切り行に反映する', () => {
    const model: TableModel = { ...base, aligns: ['left', 'right'] };
    expect(toMarkdown(model, { pad: false })).toBe(
      ['| Name | Qty |', '| :--- | ---: |', '| Apple | 10 |'].join('\n'),
    );
  });

  it('中央寄せは両端にコロンを置く', () => {
    const model: TableModel = { ...base, aligns: ['center', 'center'] };
    expect(toMarkdown(model, { pad: false }).split('\n')[1]).toBe('| :---: | :---: |');
  });

  it('右寄せのセルは右に詰める', () => {
    const model: TableModel = {
      rows: [
        ['Qty'],
        ['7'],
      ],
      hasHeader: true,
      aligns: ['right'],
    };
    expect(toMarkdown(model).split('\n')[2]).toBe('|    7 |');
  });

  it('見出しなしのときは空の見出し行を出す', () => {
    const model: TableModel = { ...base, hasHeader: false };
    const lines = toMarkdown(model, { pad: false }).split('\n');
    expect(lines[0]).toBe('|  |  |');
    expect(lines).toHaveLength(4);
  });

  it('パイプと改行をエスケープする', () => {
    const model: TableModel = {
      rows: [['a|b', 'c\nd']],
      hasHeader: false,
      aligns: [],
    };
    expect(toMarkdown(model, { pad: false })).toContain('| a\\|b | c<br>d |');
  });

  it('全角文字は 2 桁として幅を合わせる', () => {
    const model: TableModel = {
      rows: [
        ['商品', 'x'],
        ['ab', 'y'],
      ],
      hasHeader: true,
      aligns: [],
    };
    const lines = toMarkdown(model).split('\n');
    // 「商品」は 4 桁ぶんなので 2 文字の 'ab' は空白 2 つで埋まる。
    expect(lines[0]).toBe('| 商品 | x   |');
    expect(lines[2]).toBe('| ab   | y   |');
  });

  it('ギザギザの行は最長行に合わせて埋める', () => {
    const model: TableModel = {
      rows: [['a', 'b', 'c'], ['d']],
      hasHeader: true,
      aligns: [],
    };
    expect(toMarkdown(model, { pad: false }).split('\n')[2]).toBe('| d |  |  |');
  });
});
