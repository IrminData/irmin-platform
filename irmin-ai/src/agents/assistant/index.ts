import { BaseAgent } from '@/agents/base';

import { agentConfig } from './config';

export class AssistantAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  // The base class handles all execution logic using your services
  // Override only if you need custom behavior
}
