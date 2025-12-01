import { indexingService, retrievalService } from '@/vector';
import { collectionService } from '@/vector/vectorCollections';
import {
  AgentMiddleware,
  DynamicStructuredTool,
  llmToolSelectorMiddleware,
  modelFallbackMiddleware,
} from 'langchain';

import { LLMOptions, llmService } from '@/services/llm';
import { toolsService } from '@/services/tools';

import { BaseAgent } from '@/agents/base';
import type { AgentInput } from '@/agents/types';

import { agentConfig } from './config';

export class QueryAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  protected async getAgentOptions(input: AgentInput): Promise<{
    llmOptions: LLMOptions;
    tools?: DynamicStructuredTool[];
    middleware?: AgentMiddleware[];
    systemPrompt?: string;
  }> {
    // Create MCP tools with auth token
    // Load all tools like assistant agent - the system prompt guides which tools to use
    const tools: DynamicStructuredTool[] = [];
    if (input.authToken) {
      const mcpConfig = toolsService.getIrminMCPConfig(input.authToken);
      const mcpClient = toolsService.createClient({
        ...mcpConfig,
      });
      const mcpTools = await toolsService.getTools(mcpClient);
      tools.push(...mcpTools);
    }

    const fallbackLLM = llmService.createLLM({
      provider: 'openai',
      model: 'gpt-5',
      temperature: 0.9,
      maxTokens: 1000,
      streaming: false,
    });

    const cheaperLLM = llmService.createLLM({
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      streaming: false,
    });

    return {
      llmOptions: {
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.9,
        maxTokens: 1000,
        streaming: false,
        anthropic: {
          thinking: {
            budget_tokens: 1024,
            type: 'enabled',
          },
        },
      },
      tools,
      middleware: [
        llmToolSelectorMiddleware({
          model: cheaperLLM,
          maxTools: 5,
          alwaysInclude: [
            'retrieve_docs_context',
            'get_repository_object_schema',
            'execute_sql',
          ],
        }),
        modelFallbackMiddleware(fallbackLLM),
      ],
    };
  }

  protected async prepareContext(
    input: AgentInput
  ): Promise<Record<string, unknown>> {
    // Get base context (includes irmin-docs from BaseAgent)
    const context = await super.prepareContext(input);

    // Fetch DuckDB SQL documentation from vector store (specific to QueryAgent)
    const collectionName = 'duckdb-sql-syntax-docs';

    // Check if collection exists before trying to use it
    const collection = await collectionService.getCollectionByName(
      collectionName,
      undefined,
      undefined,
      true // isSystemCollection
    );

    if (!collection) {
      console.warn(
        `Collection '${collectionName}' not found. DuckDB documentation context will not be available. ` +
          `Run the vectorize-docs script to create this collection: ` +
          `POST /api/system/scripts/vectorize-docs or tsx src/scripts/vectorize-docs.ts`
      );
      return context;
    }

    try {
      const vectorStore = await indexingService.initVectorStore(
        collectionName,
        true
      );

      const docsResult = await retrievalService.retrieveWithHypotheticalContent(
        vectorStore,
        input.message,
        {
          maxDocuments: 5,
          scoreThreshold: 0.3,
          includeMetadata: false,
          maxTokens: 6000,
        },
        collectionName
      );

      if (docsResult.context && docsResult.context.trim()) {
        context.duckdb_documentation = docsResult.context;
      }
    } catch (error) {
      console.warn(
        `Failed to retrieve DuckDB documentation context: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return context;
  }

  // Uses base execute() - non-streaming
}
