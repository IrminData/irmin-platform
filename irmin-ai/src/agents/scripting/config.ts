import { AgentConfig } from '@/agents/types';

export const agentConfig: AgentConfig = {
  id: 'scripting',
  name: 'Go Script Generator',
  description: 'Generates Go scripts from natural language descriptions',
  supportsStreaming: false,
  contextRequirements: [],
};
