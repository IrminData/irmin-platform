import type { ModelProfile, ModelRole } from './types';

export const BASELINE_MODEL = 'anthropic/claude-sonnet-4.6';

export const REVIEWED_ZDR_PROVIDER_CONFIGS = [
  {
    name: 'Anthropic',
    operator: 'Anthropic PBC',
    zdrEvidence: 'https://openrouter.ai/docs/features/zdr',
    reviewedAt: '2026-08-15',
    capabilities: ['tools', 'structured_output', 'reasoning', 'streaming'],
    rollbackOwner: 'AI runtime on-call',
  },
  {
    name: 'OpenAI',
    operator: 'OpenAI, L.L.C.',
    zdrEvidence: 'https://openrouter.ai/docs/features/zdr',
    reviewedAt: '2026-08-15',
    capabilities: ['tools', 'structured_output', 'reasoning', 'streaming'],
    rollbackOwner: 'AI runtime on-call',
  },
  {
    name: 'Google AI Studio',
    operator: 'Google LLC',
    zdrEvidence: 'https://openrouter.ai/docs/features/zdr',
    reviewedAt: '2026-08-15',
    capabilities: ['tools', 'structured_output', 'reasoning', 'streaming'],
    rollbackOwner: 'AI runtime on-call',
  },
] as const;

export const REVIEWED_ZDR_PROVIDERS = REVIEWED_ZDR_PROVIDER_CONFIGS.map(
  ({ name }) => name
);

const assistantCapabilities = {
  tools: true,
  structuredOutput: true,
  reasoning: true,
  contextSize: 200_000,
};

const specialistCapabilities = {
  tools: true,
  structuredOutput: true,
  reasoning: true,
  contextSize: 128_000,
};

const cheapCapabilities = {
  tools: false,
  structuredOutput: true,
  reasoning: false,
  contextSize: 128_000,
};

export const MODEL_PROFILE: ModelProfile = {
  id: 'irmin-balanced',
  version: '2026-08-15.2',
  providerAllowlist: REVIEWED_ZDR_PROVIDERS,
  privacy: { zdrRequired: true, dataCollection: 'deny' },
  roles: {
    assistant: {
      primaryModel: BASELINE_MODEL,
      fallbackModels: [],
      capabilities: assistantCapabilities,
      maxInputTokens: 64_000,
      maxOutputTokens: 16_000,
      timeoutMs: 300_000,
    },
    query: {
      primaryModel: BASELINE_MODEL,
      fallbackModels: [],
      capabilities: specialistCapabilities,
      maxInputTokens: 96_000,
      maxOutputTokens: 16_000,
      timeoutMs: 300_000,
    },
    scripting: {
      primaryModel: BASELINE_MODEL,
      fallbackModels: [],
      capabilities: specialistCapabilities,
      maxInputTokens: 96_000,
      maxOutputTokens: 16_000,
      timeoutMs: 300_000,
    },
    tool_selector: {
      primaryModel: BASELINE_MODEL,
      fallbackModels: [],
      capabilities: { ...cheapCapabilities, tools: true },
      maxInputTokens: 32_000,
      maxOutputTokens: 2_000,
      timeoutMs: 60_000,
    },
    summarizer: {
      primaryModel: BASELINE_MODEL,
      fallbackModels: [],
      capabilities: cheapCapabilities,
      maxInputTokens: 48_000,
      maxOutputTokens: 4_000,
      timeoutMs: 60_000,
    },
    title: {
      primaryModel: BASELINE_MODEL,
      fallbackModels: [],
      capabilities: cheapCapabilities,
      maxInputTokens: 8_000,
      maxOutputTokens: 128,
      timeoutMs: 30_000,
    },
    hyde: {
      primaryModel: BASELINE_MODEL,
      fallbackModels: [],
      capabilities: cheapCapabilities,
      maxInputTokens: 16_000,
      maxOutputTokens: 2_000,
      timeoutMs: 60_000,
    },
  },
};

export const EVALUATION_CANDIDATES: Readonly<
  Record<ModelRole, readonly string[]>
> = {
  assistant: [
    'openai/gpt-5.6-terra',
    'anthropic/claude-opus-4.8',
    'anthropic/claude-sonnet-4.6',
    'google/gemini-3.7-flash',
  ],
  query: [
    'openai/gpt-5.6-sol',
    'openai/gpt-5.6-terra',
    'anthropic/claude-opus-4.8',
    'anthropic/claude-sonnet-4.6',
  ],
  scripting: [
    'openai/gpt-5.6-sol',
    'openai/gpt-5.6-terra',
    'anthropic/claude-opus-4.8',
    'anthropic/claude-sonnet-4.6',
  ],
  tool_selector: [
    'openai/gpt-5.6-luna',
    'google/gemini-3.7-flash',
    'anthropic/claude-haiku-4.5',
  ],
  summarizer: [
    'openai/gpt-5.6-luna',
    'google/gemini-3.7-flash',
    'anthropic/claude-haiku-4.5',
  ],
  title: [
    'openai/gpt-5.6-luna',
    'google/gemini-3.7-flash',
    'anthropic/claude-haiku-4.5',
  ],
  hyde: [
    'openai/gpt-5.6-luna',
    'google/gemini-3.7-flash',
    'anthropic/claude-haiku-4.5',
  ],
};

/** Reject profile models that have not entered the reviewed evaluation matrix. */
export function assertReviewedModelProfile(profile: ModelProfile): void {
  for (const [role, roleProfile] of Object.entries(profile.roles) as Array<
    [ModelRole, ModelProfile['roles'][ModelRole]]
  >) {
    const approved = new Set([BASELINE_MODEL, ...EVALUATION_CANDIDATES[role]]);
    const configured = [
      roleProfile.primaryModel,
      ...roleProfile.fallbackModels,
    ];
    const unreviewed = configured.filter((model) => !approved.has(model));
    if (unreviewed.length) {
      throw new Error(
        `Model profile role ${role} contains unreviewed models: ${unreviewed.join(', ')}`
      );
    }
    if (new Set(configured).size !== configured.length) {
      throw new Error(`Model profile role ${role} contains duplicate models`);
    }
  }
}
