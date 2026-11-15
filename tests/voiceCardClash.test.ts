import assert from 'node:assert/strict';
import test from 'node:test';
import { isLegalClashCard, type ClashCard, type PlayedCard } from '../src/components/voice-card-clash/gameLogic.ts';

const card = (id: string, suit: ClashCard['suit'], rank: number): ClashCard => ({ id, suit, rank, label: String(rank) });
const lead: PlayedCard = { playerId: 'p1', seat: 0, team: 'alpha', card: card('lead', '♠', 9) };

test('trick players must follow the led suit when they have one', () => {
  const hand = [card('spade', '♠', 3), card('heart', '♥', 14)];
  assert.equal(isLegalClashCard(hand, [lead], 'spade'), true);
  assert.equal(isLegalClashCard(hand, [lead], 'heart'), false);
});

test('players may discard when void in the led suit and may lead any suit', () => {
  const hand = [card('heart', '♥', 8), card('club', '♣', 10)];
  assert.equal(isLegalClashCard(hand, [lead], 'heart'), true);
  assert.equal(isLegalClashCard(hand, [], 'club'), true);
});

test('a card not present in the player hand is never legal', () => {
  assert.equal(isLegalClashCard([card('spade', '♠', 3)], [lead], 'missing'), false);
});
