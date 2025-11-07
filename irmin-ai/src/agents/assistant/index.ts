import { indexingService, retrievalService } from '@/vector';

import { BaseAgent } from '@/agents/base';
import { AgentInput } from '@/agents/types';

import { agentConfig } from './config';

export class AssistantAgent extends BaseAgent {
  constructor() {
    super(agentConfig);
  }

  // The base class handles all execution logic using your services
  // Override only if you need custom behavior

  /**
   * Override prepareContext to add documentation retrieval from irmin-docs vector store.
   *
   * This extends the base class behavior by:
   * - Querying the irmin-docs collection for relevant documentation based on user input
   * - Using hypothetical content generation for better retrieval accuracy
   * - Adding retrieved documentation to context as 'irmin_documentation' field
   * - Using direct vector store connection with environment-based QDRANT configuration
   * - Providing graceful fallback if documentation retrieval fails
   *
   * The base class only passes through input context, but the assistant agent
   * needs access to relevant documentation to provide better responses.
   */
  async prepareContext(input: AgentInput): Promise<Record<string, unknown>> {
    // Start with the input context
    const context: Record<string, unknown> = { ...input.context };

    try {
      // Create vector store connection directly to irmin-docs collection
      const vectorStore = await indexingService.initVectorStore(
        'irmin-docs',
        true
      );

      // Retrieve relevant documentation context using hypothetical content generation
      // This improves retrieval by generating a hypothetical answer that better matches document content
      const docsResult = await retrievalService.retrieveWithHypotheticalContent(
        vectorStore,
        input.message,
        {
          maxDocuments: 5,
          scoreThreshold: 0.3,
          includeMetadata: false,
          maxTokens: 3000,
        },
        'irmin-docs'
      );

      if (docsResult.context && docsResult.context.trim()) {
        context.irmin_documentation = docsResult.context;
      }
    } catch (error) {
      // Log error but don't fail the entire request
      console.warn('Failed to retrieve documentation context:', error);
    }

    return context;
  }
}
