import { AgentsClient } from './AgentsClient';
import { ChatClient } from './ChatClient';
import { ConversationsClient } from './ConversationsClient';
import { InfoClient } from './InfoClient';

export default class IrminAIClient {
  public readonly chat: ChatClient;
  public readonly conversations: ConversationsClient;
  public readonly agents: AgentsClient;
  public readonly info: InfoClient;

  constructor(token: string, workspaceSlug: string) {
    this.chat = new ChatClient(token, workspaceSlug);
    this.conversations = new ConversationsClient(token, workspaceSlug);
    this.agents = new AgentsClient(token, workspaceSlug);
    this.info = new InfoClient(token, workspaceSlug);
  }
}
