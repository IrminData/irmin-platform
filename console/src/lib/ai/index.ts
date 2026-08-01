import { AgentsClient } from './AgentsClient';
import { ConversationsClient } from './ConversationsClient';
import { InfoClient } from './InfoClient';

export default class IrminAIClient {
  public readonly conversations: ConversationsClient;
  public readonly agents: AgentsClient;
  public readonly info: InfoClient;

  constructor(token: string, workspaceSlug: string) {
    this.conversations = new ConversationsClient(token, workspaceSlug);
    this.agents = new AgentsClient(token, workspaceSlug);
    this.info = new InfoClient(token, workspaceSlug);
  }
}
