import { useCallback, useMemo, useState } from 'react';
import type { TableModel } from './types';

const LIMIT = 100;

interface History {
  past: TableModel[];
  present: TableModel;
  future: TableModel[];
}

/**
 * 表の編集履歴。過去・現在・未来をひとつの state にまとめ、更新はすべて
 * 関数型の更新で行う（StrictMode の二重呼び出しでも履歴がずれないようにするため）。
 */
export function useTableHistory(initial: TableModel) {
  const [history, setHistory] = useState<History>({
    past: [],
    present: initial,
    future: [],
  });

  /** 現在値を変更し、変更前の値を履歴に 1 件積む。 */
  const setTable = useCallback((next: TableModel | ((prev: TableModel) => TableModel)) => {
    setHistory((state) => {
      const value = typeof next === 'function' ? next(state.present) : next;
      if (value === state.present) return state;
      return {
        past: [...state.past, state.present].slice(-LIMIT),
        present: value,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((state) => {
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((state) => {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present].slice(-LIMIT),
        present: next,
        future: rest,
      };
    });
  }, []);

  /** 履歴を捨てて表を差し替える（取り込みや全消去で使う）。 */
  const reset = useCallback((value: TableModel) => {
    setHistory({ past: [], present: value, future: [] });
  }, []);

  return useMemo(
    () => ({
      table: history.present,
      setTable,
      undo,
      redo,
      reset,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    }),
    [history, setTable, undo, redo, reset],
  );
}
