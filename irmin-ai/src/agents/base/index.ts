import IrminCore from '@/irmin-api';
import { indexingService, retrievalService } from '@/vector';
import fs from 'fs/promises';
import { AgentMiddleware, BaseMessage, DynamicStructuredTool } from 'langchain';
import path from 'path';

import agentService from '@/services/agent';
import type { LLMOptions } from '@/services/llm';
import { systemPromptBuilder } from '@/services/systemPromptBuilder';

import type {
  AgentConfig,
  AgentInput,
  AgentResponse,
  BaseAgentInterface,
} from '@/agents/types';

export abstract class BaseAgent implements BaseAgentInterface {
  public config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Subclasses override this to specify LLM config, tools, and middleware
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async getAgentOptions(_input: AgentInput): Promise<{
    llmOptions: LLMOptions;
    tools?: DynamicStructuredTool[];
    middleware?: AgentMiddleware[];
    systemPrompt?: string;
  }> {
    // Default: cheap Groq model as fallback
    return {
      llmOptions: {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
      },
    };
  }

  /**
   * Subclasses can override to add custom context (e.g., vector search)
   */
  protected async prepareContext(
    input: AgentInput
  ): Promise<Record<string, unknown>> {
    const context: Record<string, unknown> = { ...(input.context || {}) };

    // We shall keep this log in the code for now, since it would make it easier to debug
    // in case something goes wrong with the context preparation.
    console.log(
      'Agent Base prepareContext agent input',
      JSON.stringify(input, null, 2)
    );

    // Fetch Irmin documentation from vector store (common to all agents)
    // This runs regardless of workspace/authToken since docs are system-wide
    try {
      const collectionName = await indexingService.validateCollectionAccess(
        'irmin-docs',
        true
      );

      const docsResult = await retrievalService.retrieveWithHypotheticalContent(
        collectionName,
        input.message,
        {
          maxDocuments: 5,
          scoreThreshold: 0.3,
          includeMetadata: false,
          maxTokens: 6000,
        },
        {
          agentDescription: this.config.description,
          agentName: this.config.name,
        }
      );

      if (docsResult.context && docsResult.context.trim()) {
        context.irmin_documentation = docsResult.context;
      }
    } catch (error) {
      console.warn('Failed to retrieve Irmin documentation context:', error);
    }

    await this.prepareNonDocsContext(input, context);

    return context;
  }

  protected async prepareNonDocsContext(
    input: AgentInput,
    context: Record<string, unknown>
  ): Promise<void> {
    // Initialize IrminCore
    const irmin = new IrminCore(input.authToken || '');
    const workspace = input.workspace?.slug || '';

    if (!workspace || !input.authToken) {
      return;
    }

    try {
      const promises: Promise<void>[] = [];

      // 1. Fetch Connection
      if (input.context?.['connection-id']) {
        promises.push(
          (async () => {
            const connectionId = input.context?.['connection-id'] as string;
            try {
              const res = await irmin.connectionService.fetchConnection({
                workspace,
                connectionID: connectionId,
              });
              if (res.data) {
                context['connection'] = JSON.stringify(res.data, null, 2);
              }
            } catch (e) {
              console.error(`Failed to fetch connection ${connectionId}:`, e);
            }
          })()
        );
      }

      // 2. Fetch Workflow
      if (input.context?.['workflow-id']) {
        promises.push(
          (async () => {
            const workflowId = input.context?.['workflow-id'] as string;
            try {
              const res = await irmin.workflowService.fetchWorkflow({
                workspace,
                workflowID: workflowId,
              });
              if (res.data) {
                context['workflow'] = JSON.stringify(res.data, null, 2);
              }
            } catch (e) {
              console.error(`Failed to fetch workflow ${workflowId}:`, e);
            }
          })()
        );
      }

      // 3. Fetch Stored Query
      if (input.context?.['stored-query-id']) {
        promises.push(
          (async () => {
            const queryId = input.context?.['stored-query-id'] as string;
            try {
              const res = await irmin.queryService.getStoredQuery({
                workspace,
                queryID: queryId,
              });
              if (res.data) {
                context['stored-query'] = JSON.stringify(res.data, null, 2);
              }
            } catch (e) {
              console.error(`Failed to fetch stored query ${queryId}:`, e);
            }
          })()
        );
      }

      // 4. Fetch Repository
      if (input.context?.['repository-slug']) {
        promises.push(
          (async () => {
            const repoSlug = input.context?.['repository-slug'] as string;
            try {
              const res = await irmin.repositoryService.fetchRepository({
                workspace,
                slug: repoSlug,
              });
              if (res.data) {
                context['repository'] = JSON.stringify(res.data, null, 2);
              }
            } catch (e) {
              console.error(`Failed to fetch repository ${repoSlug}:`, e);
            }
          })()
        );

        // 5. Fetch Repository Object Schema
        // If we have a repository slug, fetch the object schema (root or specific path)
        promises.push(
          (async () => {
            const repoSlug = input.context?.['repository-slug'] as string;
            const objectPath =
              (input.context?.['repository-object-path'] as string) || '';
            const ref =
              (input.context?.['repository-ref'] as string) || undefined; // When not provided, the default branch of the repository is used
            try {
              const res = await irmin.objectService.getObjectSchema({
                workspace,
                repository: repoSlug,
                path: objectPath,
                ref,
              });
              if (res.data) {
                context['repository-object-schema'] = JSON.stringify(
                  res.data,
                  null,
                  2
                );
              }
            } catch (e) {
              console.error(
                `Failed to fetch object schema ${objectPath || 'root'} in ${repoSlug}:`,
                e
              );
            }
          })()
        );
      }

      // 6. Fetch Editor Items (Scripts)
      if (
        input.context?.['editor-script-paths'] &&
        typeof input.context['editor-script-paths'] === 'string'
      ) {
        const scriptPaths = input.context['editor-script-paths']
          .split(',')
          .filter(Boolean);

        if (scriptPaths.length > 0) {
          promises.push(
            (async () => {
              try {
                const editorItems = await Promise.all(
                  scriptPaths.map(async (path) => {
                    try {
                      const res =
                        await irmin.editorItemService.getEditorItemContent({
                          workspace,
                          path: path.trim(),
                        });
                      return {
                        path: path.trim(),
                        content: res.data,
                      };
                    } catch (e) {
                      console.error(
                        `Failed to fetch editor item content for ${path}:`,
                        e
                      );
                      return {
                        path: path.trim(),
                        error: 'Failed to fetch content',
                      };
                    }
                  })
                );
                context['editor-items'] = JSON.stringify(editorItems, null, 2);
              } catch (e) {
                console.error('Failed to fetch editor items:', e);
              }
            })()
          );
        }
      }

      await Promise.all(promises);
    } catch (e) {
      console.error('Error fetching context objects:', e);
    }
  }

  /**
   * Load system prompt from file
   */
  protected async loadSystemPrompt(): Promise<string> {
    try {
      const promptPath = path.join(
        process.cwd(),
        'src/agents',
        this.config.id,
        'system-prompt.txt'
      );
      return await fs.readFile(promptPath, 'utf-8');
    } catch {
      // Fallback to config-based prompt
      return `You are ${this.config.name}. ${this.config.description}`;
    }
  }

  /**
   * Validate input based on context requirements
   */
  validateInput(input: AgentInput): boolean {
    // Check message
    if (!input.message || input.message.trim() === '') {
      return false;
    }

    // Check context requirements
    for (const requirement of this.config.contextRequirements) {
      if (requirement.required && !input.context?.[requirement.name]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Creates a configured LangChain agent ready for execution
   */
  async createAgent(input: AgentInput, conversationId: string) {
    // 1. Validate input
    if (!this.validateInput(input)) {
      throw new Error('Invalid input for agent');
    }

    // 2. Get agent options from subclass
    const options = await this.getAgentOptions(input);

    // 3. Prepare context
    const context = await this.prepareContext(input);

    // 4. Build system prompt
    const basePrompt = await this.loadSystemPrompt();

    // Extract context descriptions from config
    const contextDescriptions: Record<string, string> = {};
    if (this.config.contextRequirements) {
      for (const req of this.config.contextRequirements) {
        contextDescriptions[req.name] = req.description;
      }
    }

    const systemPrompt = systemPromptBuilder.buildSystemPrompt(basePrompt, {
      user: input.user,
      workspace: input.workspace,
      conversationId,
      agentId: this.config.id,
      customContext: context,
      contextDescriptions,
    });

    // 5. Create LangChain agent via AgentService
    const agent = await agentService.getAgent({
      llmOptions: options.llmOptions,
      systemPrompt,
      tools: options.tools,
      middleware: options.middleware,
    });

    return agent;
  }

  /**
   * Main execute method - subclasses can override for custom behavior (e.g., streaming)
   */
  async execute(
    input: AgentInput,
    conversationId: string
  ): Promise<AgentResponse> {
    // Create the agent
    const agent = await this.createAgent(input, conversationId);

    // Invoke agent with thread_id = conversationId
    const result = await agentService.invokeAgent(
      agent,
      input.message,
      conversationId
    );

    // Extract content from result
    const messages = Array.isArray(result.messages) ? result.messages : [];

    // Return response
    return { messages };
  }

  /**
   * Get conversation history messages for a conversation
   */
  async getConversationHistory(conversationId: string): Promise<BaseMessage[]> {
    // Create a simple agent
    const agent = await agentService.getAgent({
      llmOptions: {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
      },
      systemPrompt: `You are a helpful assistant.`,
      tools: [],
      middleware: [],
    });

    // Get the agent state from memory
    const agentState: unknown = await agentService.getAgentState(
      agent,
      conversationId
    );

    const messages: BaseMessage[] = [];
    if (
      typeof agentState === 'object' &&
      agentState !== null &&
      'values' in agentState &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (agentState as any).values === 'object' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (agentState as any).values !== null &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Array.isArray((agentState as any).values.messages)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const message of (agentState as any).values.messages) {
        if (BaseMessage.isInstance(message)) {
          messages.push(message);
        }
      }
    }

    return messages;
  }
}
