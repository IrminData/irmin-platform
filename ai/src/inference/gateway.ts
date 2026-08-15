import { env } from '@/config/env';

import { DirectAnthropicAdapter, OpenRouterAdapter } from './adapters';
import { ProfiledInferenceGateway } from './profiledGateway';
import { MODEL_PROFILE, REVIEWED_ZDR_PROVIDERS } from './profiles';

const providerAllowlist = env.OPENROUTER_PROVIDER_ALLOWLIST.split(',')
  .map((provider) => provider.trim())
  .filter(Boolean);

export const inferenceGateway = new ProfiledInferenceGateway({
  profile: MODEL_PROFILE,
  backend: env.AI_INFERENCE_BACKEND,
  canaryPercent: env.OPENROUTER_CANARY_PERCENT,
  openRouter: new OpenRouterAdapter({
    apiKey: env.OPENROUTER_API_KEY,
    siteUrl: env.OPENROUTER_SITE_URL,
    siteName: env.OPENROUTER_SITE_NAME,
    providerAllowlist,
    reviewedProviders: REVIEWED_ZDR_PROVIDERS,
  }),
  directAnthropic: new DirectAnthropicAdapter(env.ANTHROPIC_API_KEY),
});
