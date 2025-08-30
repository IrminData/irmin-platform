import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'chat',
  name: 'General Assistant Chat Agent',
  description:
    'General purpose chat agent that can answer questions and help with tasks',
  type: 'chat',
  modelProvider: 'groq',
  model: 'qwen/qwen3-32b',
  temperature: 0.7,
  maxTokens: 4000,
  responseFormat: 'markdown',
  contextRequirements: [
    {
      type: 'conversation',
      name: 'conversation_history',
      required: false,
    },
  ],
  toolSelection: {
    includeAll: true,
  },
  streaming: true,
};
