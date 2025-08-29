import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'query',
  name: 'SQL Query Generator',
  description: 'Converts natural language to SQL queries',
  type: 'single-shot',
  modelProvider: 'openai',
  model: 'gpt-5',
  temperature: 0.25,
  maxTokens: 1000,
  responseFormat: 'structured',
  contextRequirements: [
    {
      type: 'schema',
      name: 'schema',
      required: true,
    },
  ],
  useTools: false,
  streaming: false,
};
