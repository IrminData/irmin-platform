import { indexingService, retrievalService } from '@/vector';
import { collectionService } from '@/vector/vectorCollections';
import {
  AgentMiddleware,
  DynamicStructuredTool,
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
    // Create MCP tools with auth token and filter to only include the required tools
    const tools: DynamicStructuredTool[] = [];
    if (input.authToken) {
      const mcpConfig = toolsService.getIrminMCPConfig(input.authToken);
      const mcpClient = toolsService.createClient({
        // Add MCP servers here...
        ...mcpConfig,
      });
      const mcpTools = await toolsService.getTools(mcpClient);

      // Only include the necessary tools
      const requiredToolNames = [
        'irmin_list_repositories',
        'irmin_list_repository_objects',
        'irmin_list_repository_branches',
        'irmin_list_repository_tags',
        'irmin_get_repository_object_schema',
        'irmin_retrieve_docs_context',
        'irmin_execute_sql',
      ];
      const filteredTools = mcpTools.filter((tool) =>
        requiredToolNames.includes(tool.name)
      );
      tools.push(...filteredTools);
    }

    const fallbackLLM = llmService.createLLM({
      // Keep fallback on Anthropic so conversation history with Anthropic
      // thinking blocks remains provider-compatible.
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 2048,
      streaming: false,
    });

    return {
      llmOptions: {
        provider: 'anthropic' as const,
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.9,
        maxTokens: 2048,
        streaming: false,
        anthropic: {
          thinking: {
            budget_tokens: 1024,
            type: 'enabled',
          },
        },
      },
      tools,
      middleware: [modelFallbackMiddleware(fallbackLLM)],
    };
  }

  protected async prepareContext(
    input: AgentInput
  ): Promise<Record<string, unknown>> {
    const context: Record<string, unknown> = { ...(input.context || {}) };

    // 1. Prepare non-docs context (connection, workflow, repo, schema, etc.)
    await this.prepareNonDocsContext(input, context);

    // 2. Prepare Agent Context
    const agentContext = {
      agentDescription: this.config.description,
      agentName: this.config.name,
      currentSql: input.context?.['current-sql'] as string | undefined,
    };

    // 3. Retrieve documentation (Irmin Docs & DuckDB Docs)
    // We try to retrieve DuckDB docs first to generate a SQL-specific hypothetical,
    // which we then reuse for Irmin docs to save an LLM call.
    const duckDbCollectionName = 'duckdb-sql-syntax-docs';
    const irminDocsCollectionName = 'irmin-docs';

    let hypotheticalContent: string | undefined;

    // A. Retrieve DuckDB Docs
    try {
      // Check if collection exists
      const duckDbCollection = await collectionService.getCollectionByName(
        duckDbCollectionName,
        undefined,
        undefined,
        true // isSystemCollection
      );

      if (duckDbCollection) {
        const duckDbCollectionNameValidated =
          await indexingService.validateCollectionAccess(
            duckDbCollectionName,
            true
          );

        const duckDbResult =
          await retrievalService.retrieveWithHypotheticalContent(
            duckDbCollectionNameValidated,
            input.message,
            {
              maxDocuments: 5,
              scoreThreshold: 0.3,
              includeMetadata: false,
              maxTokens: 6000,
            },
            agentContext
          );

        if (duckDbResult.context && duckDbResult.context.trim()) {
          context.duckdb_documentation = duckDbResult.context;
        }

        // Capture hypothetical content for reuse
        if (duckDbResult.usedHypothetical && duckDbResult.hypotheticalContent) {
          hypotheticalContent = duckDbResult.hypotheticalContent;
        }
      } else {
        console.warn(
          `Collection '${duckDbCollectionName}' not found. DuckDB documentation context will not be available.`
        );
      }
    } catch (error) {
      console.warn(
        `Failed to retrieve DuckDB documentation context: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // B. Retrieve Irmin Docs
    // If we have hypothetical content from DuckDB retrieval, use retrieveContext directly.
    // Otherwise, use retrieveWithHypotheticalContent.
    try {
      const irminCollectionName =
        await indexingService.validateCollectionAccess(
          irminDocsCollectionName,
          true
        );

      if (hypotheticalContent) {
        // Reuse hypothetical content
        const irminResult = await retrievalService.retrieveContext(
          irminCollectionName,
          hypotheticalContent,
          {
            maxDocuments: 5,
            scoreThreshold: 0.3,
            includeMetadata: false,
            maxTokens: 6000,
          }
        );

        if (irminResult.context && irminResult.context.trim()) {
          context.irmin_documentation = irminResult.context;
        }
      } else {
        // Generate new hypothetical content
        const irminResult =
          await retrievalService.retrieveWithHypotheticalContent(
            irminCollectionName,
            input.message,
            {
              maxDocuments: 5,
              scoreThreshold: 0.3,
              includeMetadata: false,
              maxTokens: 6000,
            },
            agentContext
          );

        if (irminResult.context && irminResult.context.trim()) {
          context.irmin_documentation = irminResult.context;
        }
      }
    } catch (error) {
      console.warn(
        `Failed to retrieve Irmin documentation context: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return context;
  }

  // Uses base execute() - non-streaming
}
