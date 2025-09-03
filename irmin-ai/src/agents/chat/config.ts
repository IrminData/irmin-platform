import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'chat',
  name: 'General Assistant Chat Agent',
  description:
    'General purpose chat agent that can answer questions and help with tasks',
  type: 'chat',
  modelProvider: 'groq',
  model: 'moonshotai/kimi-k2-instruct',
  temperature: 0.7,
  maxTokens: 4000,
  responseFormat: 'markdown',
  contextRequirements: [],
  toolSelection: {
    includeAll: true,
  },
  streaming: true,
};
