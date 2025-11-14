import { BaseAgent } from '@/agents/base';

import { agentConfig } from './config';

export class ScriptingAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  protected async getAgentOptions() {
    return {
      llmOptions: {
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        maxTokens: 2000,
      },
    };
  }

  // Uses base execute() - non-streaming
}
