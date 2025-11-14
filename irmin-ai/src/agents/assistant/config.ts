import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'assistant',
  name: 'General Assistant Chat Agent',
  description:
    'General purpose chat agent that can answer questions and help with tasks',
  supportsStreaming: true,
  contextRequirements: [],
};
