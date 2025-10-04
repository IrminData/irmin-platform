import { AgentConfig } from '@/agents/types';

import { DEFAULT_MODELS } from '@/config/defaults';

export const agentConfig: AgentConfig = {
  id: 'assistant',
  name: 'General Assistant Chat Agent',
  description:
    'General purpose chat agent that can answer questions and help with tasks',
  modelProvider: 'anthropic',
  model: DEFAULT_MODELS.anthropic,
  temperature: 0.8,
  maxTokens: 6000,
  contextRequirements: [],
  toolSelection: {
    includeAll: true,
  },
  streaming: true,
  useAgentGraph: true,
  maxToolCalls: 10,
  maxUserInputChars: 35000, // ~10k tokens
  maxSystemPromptChars: 210000, // ~60k tokens
};
