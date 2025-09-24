import { AgentConfig } from '@/agents/types';

import { DEFAULT_MODELS } from '@/config/defaults';

export const agentConfig: AgentConfig = {
  id: 'assistant',
  name: 'General Assistant Chat Agent',
  description:
    'General purpose chat agent that can answer questions and help with tasks',
  type: 'chat',
  modelProvider: 'anthropic',
  model: DEFAULT_MODELS.anthropic,
  temperature: 0.7,
  maxTokens: 6000,
  responseFormat: 'markdown',
  contextRequirements: [],
  toolSelection: {
    includeAll: true,
  },
  streaming: true,
  useAgentGraph: true,
  maxToolCalls: 10,
};
