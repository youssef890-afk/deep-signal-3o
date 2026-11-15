export const TIC_TAC_TOE_MARKS = ['X', 'O', '△', '□'] as const;
export type TicTacToeMark = (typeof TIC_TAC_TOE_MARKS)[number];
export type TicTacToeCell = TicTacToeMark | null;

export function calculateTicTacToeWinner(board: TicTacToeCell[], size: number): TicTacToeMark | null {
  if (![3, 4, 5].includes(size) || board.length !== size * size) return null;
  const target = size === 3 ? 3 : 4;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;

  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      const mark = board[row * size + column];
      if (!mark) continue;

      for (const [rowStep, columnStep] of directions) {
        let matches = 1;
        for (let step = 1; step < target; step++) {
          const nextRow = row + rowStep * step;
          const nextColumn = column + columnStep * step;
          if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) break;
          if (board[nextRow * size + nextColumn] !== mark) break;
          matches++;
        }
        if (matches === target) return mark;
      }
    }
  }
  return null;
}

export function isValidTicTacToeSnapshot(
  board: unknown,
  size: number,
  capacity: number,
  turn: number,
): board is TicTacToeCell[] {
  if (![3, 4, 5].includes(size) || ![2, 3, 4].includes(capacity)) return false;
  if (!Array.isArray(board) || board.length !== size * size) return false;
  if (!Number.isInteger(turn) || turn < 0 || turn >= capacity) return false;
  return board.every((cell) => cell === null || (TIC_TAC_TOE_MARKS as readonly unknown[]).includes(cell));
}

export function chooseTicTacToeAiMove(board: TicTacToeCell[], size: number): number | null {
  if (![3, 4, 5].includes(size) || board.length !== size * size) return null;
  const empty = board.flatMap((cell, index) => cell === null ? [index] : []);
  if (empty.length === 0 || calculateTicTacToeWinner(board, size)) return null;

  const immediate = (mark: TicTacToeMark) => empty.find((index) => {
    const next = [...board];
    next[index] = mark;
    return calculateTicTacToeWinner(next, size) === mark;
  });
  const winningMove = immediate('O');
  if (winningMove !== undefined) return winningMove;
  const blockingMove = immediate('X');
  if (blockingMove !== undefined) return blockingMove;

  if (size === 3) {
    const minimax = (position: TicTacToeCell[], oTurn: boolean): number => {
      const winner = calculateTicTacToeWinner(position, 3);
      if (winner === 'O') return 10;
      if (winner === 'X') return -10;
      if (position.every((cell) => cell !== null)) return 0;
      const scores = position.flatMap((cell, index) => {
        if (cell !== null) return [];
        const next = [...position];
        next[index] = oTurn ? 'O' : 'X';
        return [minimax(next, !oTurn)];
      });
      return oTurn ? Math.max(...scores) : Math.min(...scores);
    };

    const scoredMoves = empty.map((index) => {
      const next = [...board];
      next[index] = 'O';
      return { index, score: minimax(next, false) };
    });
    const bestScore = Math.max(...scoredMoves.map(({ score }) => score));
    const bestMoves = scoredMoves.filter(({ score }) => score === bestScore);
    return bestMoves[Math.floor(Math.random() * bestMoves.length)]?.index ?? null;
  }

  const center = Math.floor(size / 2) * size + Math.floor(size / 2);
  return board[center] === null ? center : empty[0];
}
