import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'scripting',
  name: 'Go Script Generator',
  description: 'Generates Go scripts from natural language descriptions',
  type: 'single-shot',
  modelProvider: 'openai',
  model: 'gpt-5',
  temperature: 0.25,
  maxTokens: 2000,
  responseFormat: 'structured',
  contextRequirements: [],
  useTools: false,
  streaming: false,
};
