import { User } from '@/irmin-api/types/user';
import { Workspace } from '@/irmin-api/types/workspace';

interface SystemPromptContext {
  user?: User;
  workspace?: Workspace;
  conversationId?: string;
  agentId?: string;
  customContext?: Record<string, unknown>;
}

class SystemPromptBuilder {
  private readonly DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant integrated with the Irmin data platform. You can help users with:

- Data analysis and insights
- Querying and exploring datasets
- Understanding data schemas and structures
- Providing guidance on data workflows
- Answering questions about the platform

Be helpful, accurate, and concise in your responses. If you need to access data or perform specific operations, use the available tools and functions.`;

  /**
   * Build a complete system prompt with context injection
   */
  buildSystemPrompt(
    basePrompt?: string,
    context?: SystemPromptContext
  ): string {
    const promptParts: string[] = [];

    // Add base prompt (from agent file or default)
    if (basePrompt) {
      promptParts.push(basePrompt);
    } else {
      promptParts.push(this.DEFAULT_SYSTEM_PROMPT);
    }

    // Add context information if provided
    if (context) {
      const contextInfo = this.buildContextInfo(context);
      if (contextInfo) {
        promptParts.push('\n\n## Context Information');
        promptParts.push(contextInfo);
      }
    }

    return promptParts.join('');
  }

  /**
   * Build context information section
   */
  private buildContextInfo(context: SystemPromptContext): string {
    const contextParts: string[] = [];

    // Add timestamp
    const now = new Date();
    const timestamp = now.toISOString();
    const localTime = now.toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
    contextParts.push(`- Current time: ${localTime} (${timestamp})`);

    // Add user information
    if (context.user) {
      const user = context.user;
      const userName = `${user.first_name} ${user.last_name}`.trim();
      contextParts.push(`- User: ${userName} (${user.email})`);
      if (user.company) {
        contextParts.push(`- Company: ${user.company}`);
      }
    }

    // Add workspace information
    if (context.workspace) {
      const workspace = context.workspace;
      contextParts.push(`- Workspace: ${workspace.name} (${workspace.slug})`);
      if (workspace.description) {
        contextParts.push(`- Workspace Description: ${workspace.description}`);
      }
    }

    // Add conversation context
    if (context.conversationId) {
      contextParts.push(`- Conversation ID: ${context.conversationId}`);
    }

    // Add agent context
    if (context.agentId) {
      contextParts.push(`- Agent: ${context.agentId}`);
    }

    // Add custom context
    if (context.customContext) {
      for (const [key, value] of Object.entries(context.customContext)) {
        if (value !== null && value !== undefined) {
          contextParts.push(`- ${key}: ${String(value)}`);
        }
      }
    }

    return contextParts.length > 0 ? contextParts.join('\n') : '';
  }

  /**
   * Get the default system prompt
   */
  getDefaultSystemPrompt(): string {
    return this.DEFAULT_SYSTEM_PROMPT;
  }
}

// Export singleton instance
export const systemPromptBuilder = new SystemPromptBuilder();
