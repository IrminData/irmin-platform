import { BaseAgent } from '@/agents/base';

import { agentConfig } from './config';

export class QueryAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  protected async getAgentOptions() {
    return {
      llmOptions: {
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile',
        temperature: 1.0,
        maxTokens: 1000,
      },
    };
  }

  // Uses base execute() - non-streaming
}
