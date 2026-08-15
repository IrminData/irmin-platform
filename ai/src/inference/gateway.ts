import { env } from '@/config/env';

import { OpenRouterAdapter } from './adapters';
import { ProfiledInferenceGateway } from './profiledGateway';
import {
  assertReviewedModelProfile,
  MODEL_PROFILE,
  REVIEWED_ZDR_PROVIDERS,
} from './profiles';

const providerAllowlist = env.OPENROUTER_PROVIDER_ALLOWLIST.split(',')
  .map((provider) => provider.trim())
  .filter(Boolean);

assertReviewedModelProfile(MODEL_PROFILE);

export const inferenceGateway = new ProfiledInferenceGateway({
  profile: MODEL_PROFILE,
  openRouter: new OpenRouterAdapter({
    apiKey: env.OPENROUTER_API_KEY,
    siteUrl: env.OPENROUTER_SITE_URL,
    siteName: env.OPENROUTER_SITE_NAME,
    providerAllowlist,
    reviewedProviders: REVIEWED_ZDR_PROVIDERS,
  }),
});
