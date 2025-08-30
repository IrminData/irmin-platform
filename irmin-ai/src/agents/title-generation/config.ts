import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'title-generation',
  name: 'Conversation Title Generator',
  description: 'Generates concise titles for conversations',
  type: 'single-shot',
  modelProvider: 'groq',
  model: 'llama-3.1-8b-instant',
  temperature: 0.7,
  maxTokens: 50,
  responseFormat: 'unstructured',
  contextRequirements: [],
  toolSelection: undefined,
  streaming: false,
};
