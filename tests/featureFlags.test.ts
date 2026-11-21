import assert from 'node:assert/strict';
import test from 'node:test';
import { getAppFeatureFlags } from '../src/lib/featureFlags.ts';

test('the default and Lite flavor keep Max games unavailable', () => {
  assert.deepEqual(getAppFeatureFlags(undefined), { games: false });
  assert.deepEqual(getAppFeatureFlags('lite'), { games: false });
});

test('the Max flavor enables games', () => {
  assert.deepEqual(getAppFeatureFlags('max'), { games: true });
});

test('unsupported flavors fail instead of silently selecting a variant', () => {
  assert.throws(() => getAppFeatureFlags('maxx'), /Unsupported VITE_APP_FLAVOR/);
});
