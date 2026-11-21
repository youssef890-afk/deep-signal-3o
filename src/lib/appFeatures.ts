import { getAppFeatureFlags } from '@/lib/featureFlags';

export const appFeatures = getAppFeatureFlags(import.meta.env.VITE_APP_FLAVOR);
