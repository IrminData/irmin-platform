import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'scripting',
  name: 'Go Script Generator',
  description: 'Generates Go scripts from natural language descriptions',
  type: 'chat',
  modelProvider: 'groq',
  model: 'moonshotai/kimi-k2-instruct',
  temperature: 1,
  maxTokens: 2000,
  responseFormat: 'structured',
  contextRequirements: [],
  toolSelection: {
    includeAll: true,
  },
  streaming: false,
};
