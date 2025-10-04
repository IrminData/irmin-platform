import { User } from '@/irmin-api/types/user';
import { Workspace } from '@/irmin-api/types/workspace';

import { textSanitizer } from '@/utils/sanitization';

interface SystemPromptContext {
  user?: User;
  workspace?: Workspace;
  conversationId?: string;
  agentId?: string;
  customContext?: Record<string, unknown>;
  maxUserInputChars?: number;
  maxSystemPromptChars?: number;
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
    basePrompt?: string | null,
    context?: SystemPromptContext
  ): string {
    const promptParts: string[] = [];

    // Add base prompt (from agent file or default) - NO SANITIZATION
    if (basePrompt) {
      promptParts.push(
        `<system_instructions>\n${basePrompt}\n</system_instructions>`
      );
    } else {
      promptParts.push(
        `<system_instructions>\n${this.DEFAULT_SYSTEM_PROMPT}\n</system_instructions>`
      );
    }

    // Add context information if provided (context data is sanitized)
    if (context) {
      const contextInfo = this.buildContextInfo(context);
      if (contextInfo) {
        promptParts.push(`<context>\n${contextInfo}\n</context>`);
      }
    }

    // Join all parts
    const finalPrompt = promptParts.join('\n\n');

    // Apply final length check to the complete system prompt (without sanitizing base content)
    const maxLength = context?.maxSystemPromptChars;
    if (maxLength && finalPrompt.length > maxLength) {
      const truncateLength = Math.max(0, maxLength - 3);
      return finalPrompt.substring(0, truncateLength) + '...';
    }

    return finalPrompt;
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
    contextParts.push(
      `<current_datetime>\n${localTime} (${timestamp})\n</current_datetime>`
    );

    // Add user information (sanitized with reasonable limits)
    if (context.user) {
      const user = context.user;
      const userName = `${user.first_name} ${user.last_name}`.trim();
      const sanitizedUserName = textSanitizer.sanitize(userName, 100).sanitized; // Max 100 chars for name
      const sanitizedEmail = textSanitizer.sanitize(user.email, 254).sanitized; // Max 254 chars for email
      contextParts.push(
        `<user>\n${sanitizedUserName} (${sanitizedEmail})\n</user>`
      );
      if (user.company) {
        const sanitizedCompany = textSanitizer.sanitize(
          user.company,
          200
        ).sanitized; // Max 200 chars for company
        contextParts.push(`<company>\n${sanitizedCompany}\n</company>`);
      }
    }

    // Add workspace information (sanitized with reasonable limits)
    if (context.workspace) {
      const workspace = context.workspace;
      const sanitizedWorkspaceName = textSanitizer.sanitize(
        workspace.name,
        200
      ).sanitized; // Max 200 chars for workspace name
      const sanitizedWorkspaceSlug = textSanitizer.sanitize(
        workspace.slug,
        200
      ).sanitized; // Max 200 chars for workspace slug
      contextParts.push(
        `<workspace>\n${sanitizedWorkspaceName} (${sanitizedWorkspaceSlug})\n</workspace>`
      );
      if (workspace.description) {
        const sanitizedDescription = textSanitizer.sanitize(
          workspace.description,
          300
        ).sanitized; // Max 300 chars for workspace description
        contextParts.push(
          `<workspace_description>\n${sanitizedDescription}\n</workspace_description>`
        );
      }
    }

    // Add conversation context
    if (context.conversationId) {
      contextParts.push(
        `<conversation_id>\n${context.conversationId}\n</conversation_id>`
      );
    }

    // Add agent context
    if (context.agentId) {
      contextParts.push(`<agent>\n${context.agentId}\n</agent>`);
    }

    // Add custom context (sanitized)
    if (context.customContext) {
      for (const [key, value] of Object.entries(context.customContext)) {
        if (value !== null && value !== undefined) {
          const sanitizedValue = textSanitizer.sanitize(
            String(value)
          ).sanitized;
          contextParts.push(`<${key}>\n${sanitizedValue}\n</${key}>`);
        }
      }
    }

    return contextParts.length > 0 ? contextParts.join('\n\n') : '';
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
