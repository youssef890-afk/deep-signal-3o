export type BooleanPreference = 'messages' | 'readReceipts';

export function readBooleanPreference(key: BooleanPreference, fallback = true): boolean {
  try {
    const saved = localStorage.getItem('ds-settings-v1');
    if (!saved) return fallback;
    const preferences = JSON.parse(saved) as Record<string, unknown>;
    return typeof preferences[key] === 'boolean' ? preferences[key] : fallback;
  } catch (error) {
    console.error('Saved local preferences could not be read:', error);
    return fallback;
  }
}

export function writeBooleanPreference(key: BooleanPreference, value: boolean): void {
  const saved = localStorage.getItem('ds-settings-v1');
  const preferences = saved ? JSON.parse(saved) as unknown : {};
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    throw new Error('Saved local preferences have an invalid format.');
  }

  localStorage.setItem(
    'ds-settings-v1',
    JSON.stringify({ ...preferences, [key]: value }),
  );
}
