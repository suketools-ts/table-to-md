import type { Align } from '../lib/types';

interface Props {
  aligns: Align[];
  headers: string[];
  onChange: (col: number, align: Align) => void;
  onChangeAll: (align: Align) => void;
}

const OPTIONS: Array<{ value: Align; label: string; title: string }> = [
  { value: 'default', label: '−', title: '指定なし' },
  { value: 'left', label: '⇤', title: '左寄せ' },
  { value: 'center', label: '↔', title: '中央寄せ' },
  { value: 'right', label: '⇥', title: '右寄せ' },
];

/** 列ごとの寄せ（Markdown の区切り行に出力される）を切り替えるバー。 */
export function AlignmentBar({ aligns, headers, onChange, onChangeAll }: Props) {
  if (aligns.length === 0) return null;

  return (
    <div className="align-bar">
      <div className="align-bar__head">
        <span className="align-bar__title">列の寄せ（Markdown 用）</span>
        <span className="align-bar__all">
          一括:
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="chip"
              title={option.title}
              onClick={() => onChangeAll(option.value)}
            >
              {option.label}
            </button>
          ))}
        </span>
      </div>
      <div className="align-bar__list">
        {aligns.map((align, col) => (
          <div className="align-bar__item" key={col}>
            <span className="align-bar__label" title={headers[col] || `列 ${col + 1}`}>
              {headers[col]?.trim() || `列 ${col + 1}`}
            </span>
            <div className="align-bar__buttons" role="group" aria-label={`列 ${col + 1} の寄せ`}>
              {OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`chip${align === option.value ? ' chip--on' : ''}`}
                  title={option.title}
                  aria-pressed={align === option.value}
                  onClick={() => onChange(col, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
