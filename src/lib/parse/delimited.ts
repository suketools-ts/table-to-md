import type { ParsedTable } from '../types';

export type Delimiter = ',' | '\t' | ';' | '|';

/**
 * RFC 4180 準拠の区切りテキストパーサ。
 * ダブルクォートで囲まれたセル内の区切り文字・改行・`""` によるエスケープを解釈し、
 * CRLF / CR / LF のいずれの改行にも対応する。末尾の空行 1 つは無視する
 * （Excel や Google スプレッドシートはコピー時に改行を 1 つ付けるため）。
 */
export function parseDelimited(text: string, delimiter: Delimiter): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let i = 0;

  const endCell = () => {
    row.push(cell);
    cell = '';
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }

    if (ch === '"' && cell === '') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      endCell();
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      endRow();
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    cell += ch;
    i += 1;
  }

  // 末尾のセル／行を取りこぼさない。ただし最後が改行だけなら空行を足さない。
  if (cell !== '' || row.length > 0 || rows.length === 0) endRow();

  return rows;
}

/**
 * 区切り文字を推定する。各候補について「クォート外に何個現れるか」を行ごとに数え、
 * 出現行数が多く、行ごとの個数が揃っているものを選ぶ。判定できなければカンマ。
 */
export function detectDelimiter(text: string): Delimiter {
  const candidates: Delimiter[] = ['\t', ',', ';'];
  let best: Delimiter = ',';
  let bestScore = 0;

  for (const delimiter of candidates) {
    const counts = parseDelimited(text, delimiter)
      .filter((row) => row.some((cell) => cell !== ''))
      .map((row) => row.length - 1);
    if (counts.length === 0) continue;

    const max = Math.max(...counts);
    if (max < 1) continue;
    const consistent = counts.filter((n) => n === max).length;
    // 「列が多い」より「全行で列数が揃っている」ことを重く見る。
    const score = consistent * 10 + max;
    if (score > bestScore) {
      bestScore = score;
      best = delimiter;
    }
  }

  return best;
}

/** CSV/TSV を取り込む。見出し行の有無は判定できないため常に true を返す。 */
export function parseDelimitedTable(text: string, delimiter: Delimiter): ParsedTable {
  return { rows: parseDelimited(text, delimiter), hasHeader: true, aligns: [] };
}
