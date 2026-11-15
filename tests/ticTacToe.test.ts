import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateTicTacToeWinner,
  chooseTicTacToeAiMove,
  isValidTicTacToeSnapshot,
  type TicTacToeCell,
} from '../src/lib/ticTacToe.ts';

test('finds horizontal, vertical, and diagonal three-in-a-row wins', () => {
  assert.equal(calculateTicTacToeWinner(['X', 'X', 'X', null, null, null, null, null, null], 3), 'X');
  assert.equal(calculateTicTacToeWinner(['O', null, null, 'O', null, null, 'O', null, null], 3), 'O');
  assert.equal(calculateTicTacToeWinner(['△', null, null, null, '△', null, null, null, '△'], 3), '△');
});

test('larger boards require four connected marks and reject malformed boards', () => {
  const board: TicTacToeCell[] = Array(25).fill(null);
  board[5] = 'X'; board[6] = 'X'; board[7] = 'X'; board[8] = 'X';
  assert.equal(calculateTicTacToeWinner(board, 5), 'X');
  assert.equal(calculateTicTacToeWinner(board.slice(0, 9), 5), null);
});

test('AI takes an immediate win and blocks an immediate loss', () => {
  assert.equal(chooseTicTacToeAiMove(['O', 'O', null, 'X', 'X', null, null, null, null], 3), 2);
  assert.equal(chooseTicTacToeAiMove(['X', 'X', null, 'O', null, null, null, null, null], 3), 2);
});

test('3x3 AI never chooses a move that permits an immediate human win', () => {
  const board: TicTacToeCell[] = ['X', null, null, null, 'O', null, null, null, 'X'];
  const move = chooseTicTacToeAiMove(board, 3);
  assert.notEqual(move, null);
  const afterAi = [...board];
  afterAi[move!] = 'O';
  for (let index = 0; index < afterAi.length; index++) {
    if (afterAi[index] !== null) continue;
    const afterHuman = [...afterAi];
    afterHuman[index] = 'X';
    assert.notEqual(calculateTicTacToeWinner(afterHuman, 3), 'X');
  }
});

test('online snapshots reject invalid marks, sizes, and turn indexes', () => {
  assert.equal(isValidTicTacToeSnapshot(Array(9).fill(null), 3, 2, 0), true);
  assert.equal(isValidTicTacToeSnapshot(['X', 'HACK', ...Array(7).fill(null)], 3, 2, 0), false);
  assert.equal(isValidTicTacToeSnapshot(Array(9).fill(null), 3, 2, 2), false);
  assert.equal(isValidTicTacToeSnapshot(Array(9).fill(null), 6, 2, 0), false);
});
