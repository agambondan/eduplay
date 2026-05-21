export interface Point {
  row: number;
  col: number;
}

export type Gravity = 'none' | 'down' | 'up' | 'left' | 'right';

export interface OnetConfig {
  rows: number;
  cols: number;
  tileTypes: number;
  timeLimit: number;
  iconTheme?: string;
  gravity?: Gravity;
}

export const DIFFICULTY: Record<string, OnetConfig> = {
  easy: { rows: 6, cols: 8, tileTypes: 6, timeLimit: 600, iconTheme: 'fruit', gravity: 'none' },
  medium: { rows: 8, cols: 10, tileTypes: 10, timeLimit: 900, iconTheme: 'fruit', gravity: 'down' },
  hard: { rows: 10, cols: 12, tileTypes: 15, timeLimit: 1200, iconTheme: 'fruit', gravity: 'down' },
};

export const ICON_THEMES: Record<string, string[]> = {
  fruit: ['🍎', '🍊', '🍋', '🍇', '🍉', '🍓', '🍒', '🥝', '🍌', '🍑', '🥭', '🍍', '🫐', '🥥', '🥑', '🌽'],
  sweet: ['🧁', '🍩', '🍪', '🎂', '🍫', '🍭', '🍬', '🍿', '🍰', '🥧', '🍮', '🍨', '🍦', '🍡', '🍯', '🥨'],
  animal: ['🐶', '🐱', '🐼', '🐸', '🦊', '🐰', '🐨', '🐯', '🦁', '🐮', '🐷', '🐵', '🐔', '🐧', '🦄', '🐲'],
  sport: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🏒', '🥊', '🎱', '🚴', '🏋️', '🤺', '🏹', '⛸️'],
  space: ['🌞', '🌙', '⭐', '🌍', '🌛', '☀️', '🌈', '🌪️', '🔥', '💧', '❄️', '⚡', '🌊', '🌋', '🪐', '🌟'],
  shape: ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🟥', '🟧', '🟨', '🟩', '🟦'],
};

export type Board = (number | null)[][];

export interface PathResult {
  found: boolean;
  path: Point[];
}

export async function fetchAdminConfig(): Promise<Record<string, Partial<OnetConfig>> | null> {
  try {
    const res = await fetch('/api/v1/games/onet/config');
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export function applyAdminOverrides(
  defaults: Record<string, OnetConfig>,
  overrides: Record<string, Partial<OnetConfig>> | null
): Record<string, OnetConfig> {
  if (!overrides) return defaults;
  const result: Record<string, OnetConfig> = {};
  for (const [key, cfg] of Object.entries(defaults)) {
    const override = overrides[key];
    if (override) {
      result[key] = {
        rows: override.rows ?? cfg.rows,
        cols: override.cols ?? cfg.cols,
        tileTypes: override.tileTypes ?? cfg.tileTypes,
        timeLimit: override.timeLimit ?? cfg.timeLimit,
        iconTheme: override.iconTheme ?? cfg.iconTheme,
        gravity: override.gravity ?? cfg.gravity,
      };
    } else {
      result[key] = cfg;
    }
  }
  return result;
}

export function generateBoard(config: OnetConfig): { board: Board; icons: string[]; iconMap: Map<number, string> } {
  const { rows, cols, tileTypes, iconTheme } = config;
  const totalCells = rows * cols;
  if (totalCells % 2 !== 0) throw new Error('total cells must be even');

  const fullList = iconTheme && ICON_THEMES[iconTheme] ? ICON_THEMES[iconTheme] : Object.values(ICON_THEMES).flat();
  const pairs = totalCells / 2;
  const types = Math.min(tileTypes, pairs, fullList.length);
  const icons = fullList.slice(0, types);

  const values: number[] = [];
  for (let i = 0; i < pairs; i++) {
    values.push(i % types, i % types);
  }
  shuffleArray(values);

  const board: Board = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(values[idx++]);
    }
    board.push(row);
  }

  const iconMap = new Map<number, string>();
  icons.forEach((ic, i) => iconMap.set(i, ic));

  return { board, icons, iconMap };
}

export function findPath(board: Board, start: Point, end: Point): PathResult {
  if (start.row === end.row && start.col === end.col) return { found: false, path: [] };

  const rows = board.length;
  const cols = board[0].length;

  const queue: { point: Point; turns: number; dir: string; path: Point[] }[] = [];
  const visited = new Set<string>();

  for (const dir of ['up', 'down', 'left', 'right']) {
    queue.push({ point: start, turns: 0, dir, path: [start] });
  }
  visited.add(`${start.row},${start.col}`);

  while (queue.length > 0) {
    const { point, turns, dir, path } = queue.shift()!;
    if (turns > 2) continue;
    if (point.row === end.row && point.col === end.col && turns <= 2) {
      return { found: true, path: [...path, end] };
    }
    const neighbors = getNeighbors(board, point, end, rows, cols);
    for (const n of neighbors) {
      const key = `${n.row},${n.col}`;
      if (visited.has(key)) continue;
      const newDir = getDirection(point, n);
      const newTurns = newDir !== dir ? turns + 1 : turns;
      if (newTurns > 2) continue;
      visited.add(key);
      queue.push({ point: n, turns: newTurns, dir: newDir, path: [...path] });
    }
  }

  return { found: false, path: [] };
}

function getNeighbors(board: Board, p: Point, end: Point, rows: number, cols: number): Point[] {
  const dirs = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
    { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
  ];
  const result: Point[] = [];

  for (const { dr, dc } of dirs) {
    let r = p.row + dr;
    let c = p.col + dc;
    while (r >= -1 && r <= rows && c >= -1 && c <= cols) {
      if (r === end.row && c === end.col) { result.push({ row: r, col: c }); break; }
      if (r < 0 || r >= rows || c < 0 || c >= cols) { result.push({ row: r, col: c }); break; }
      if (board[r][c] !== null) break;
      result.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
  }
  return result;
}

function getDirection(from: Point, to: Point): string {
  if (to.row < from.row) return 'up';
  if (to.row > from.row) return 'down';
  if (to.col < from.col) return 'left';
  return 'right';
}

export function applyGravity(board: Board, gravity: Gravity): Board {
  if (gravity === 'none') return board;
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map((r) => [...r]);

  if (gravity === 'down') {
    for (let c = 0; c < cols; c++) {
      const colValues: (number | null)[] = [];
      for (let r = 0; r < rows; r++) {
        if (newBoard[r][c] !== null) colValues.push(newBoard[r][c]);
      }
      while (colValues.length < rows) colValues.unshift(null);
      for (let r = 0; r < rows; r++) newBoard[r][c] = colValues[r];
    }
  } else if (gravity === 'up') {
    for (let c = 0; c < cols; c++) {
      const colValues: (number | null)[] = [];
      for (let r = 0; r < rows; r++) {
        if (newBoard[r][c] !== null) colValues.push(newBoard[r][c]);
      }
      while (colValues.length < rows) colValues.push(null);
      for (let r = 0; r < rows; r++) newBoard[r][c] = colValues[r];
    }
  } else if (gravity === 'left') {
    for (let r = 0; r < rows; r++) {
      const rowValues: (number | null)[] = [];
      for (let c = 0; c < cols; c++) {
        if (newBoard[r][c] !== null) rowValues.push(newBoard[r][c]);
      }
      while (rowValues.length < cols) rowValues.push(null);
      newBoard[r] = rowValues;
    }
  } else if (gravity === 'right') {
    for (let r = 0; r < rows; r++) {
      const rowValues: (number | null)[] = [];
      for (let c = 0; c < cols; c++) {
        if (newBoard[r][c] !== null) rowValues.push(newBoard[r][c]);
      }
      while (rowValues.length < cols) rowValues.unshift(null);
      newBoard[r] = rowValues;
    }
  }

  return newBoard;
}

export function findAnyMatch(board: Board): [Point, Point] | null {
  const rows = board.length;
  const cols = board[0].length;
  const cells: { value: number; point: Point }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== null) cells.push({ value: board[r][c]!, point: { row: r, col: c } });
    }
  }
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[i].value === cells[j].value) {
        const result = findPath(board, cells[i].point, cells[j].point);
        if (result.found) return [cells[i].point, cells[j].point];
      }
    }
  }
  return null;
}

export function hasValidMoves(board: Board): boolean {
  return findAnyMatch(board) !== null;
}

export function shuffleBoard(board: Board): Board {
  const values: number[] = [];
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== null) values.push(board[r][c]!);
    }
  }
  do { shuffleArray(values); } while (!isSolvable(values, rows, cols));
  let idx = 0;
  const newBoard: Board = [];
  for (let r = 0; r < rows; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== null) row.push(values[idx++]);
      else row.push(null);
    }
    newBoard.push(row);
  }
  return newBoard;
}

function isSolvable(values: number[], rows: number, cols: number): boolean {
  const board: Board = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < cols; c++) row.push(values[idx++]);
    board.push(row);
  }
  return hasValidMoves(board);
}

function shuffleArray(arr: number[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
