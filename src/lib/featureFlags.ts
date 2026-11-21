export interface AppFeatureFlags {
  games: boolean;
}

export function getAppFeatureFlags(flavor: string | undefined): AppFeatureFlags {
  if (flavor === undefined || flavor === 'lite') {
    return { games: false };
  }

  if (flavor === 'max') {
    return { games: true };
  }

  throw new Error(`Unsupported VITE_APP_FLAVOR "${flavor}". Use "lite" or "max".`);
}
