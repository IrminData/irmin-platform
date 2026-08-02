// LangChain StreamEvent types
// Based on @langchain/core/dist/tracers/event_stream

interface ContentBlock {
  type: 'text' | 'image_url' | 'tool_use' | 'thinking';
  text?: string;
  thinking?: string;
  image_url?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  index?: number;
}

interface ChunkKwargs {
  content: ContentBlock[] | string;
  additional_kwargs?: {
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  response_metadata?: {
    model_name?: string;
    finish_reason?: string;
  };
  id?: string;
  usage_metadata?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

interface MessageChunk {
  lc: number;
  type: string;
  id: string[];
  kwargs: ChunkKwargs;
}

interface StreamEventData {
  input?: {
    messages?: Array<{
      role: string;
      content: string;
    }>;
  };
  chunk?: MessageChunk;
  output?: {
    messages?: Array<{
      role: string;
      content: string;
    }>;
  };
}

interface StreamMetadata {
  thread_id?: string;
  langgraph_step?: number;
  langgraph_node?: string;
  langgraph_triggers?: string[];
  langgraph_path?: string[];
  checkpoint_ns?: string;
}

export interface LangChainStreamEvent {
  event:
    | 'on_chain_start'
    | 'on_chain_end'
    | 'on_chain_stream'
    | 'on_chat_model_start'
    | 'on_chat_model_stream'
    | 'on_chat_model_end'
    | 'on_tool_start'
    | 'on_tool_end';
  data: StreamEventData;
  name?: string;
  tags?: string[];
  run_id?: string;
  metadata?: StreamMetadata;
}

// Helper function to extract text from content blocks
export function extractTextFromContent(
  content: ContentBlock[] | string | undefined
): string {
  if (!content) return '';

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (block.type === 'text' && block.text) {
          return block.text;
        }
        return '';
      })
      .filter(Boolean)
      .join('');
  }

  return '';
}

// Helper function to extract thinking blocks from content
// Handles multiple formats: LangChain 'thinking' type, Anthropic signature blocks, etc.
export function extractThinkingFromContent(
  content: ContentBlock[] | string | undefined
): string[] {
  if (!content) return [];

  if (typeof content === 'string') {
    return [];
  }

  if (Array.isArray(content)) {
    const thinkingBlocks: string[] = [];

    for (const block of content) {
      // LangChain format: type: 'thinking' with thinking property
      if (block.type === 'thinking' && block.thinking) {
        thinkingBlocks.push(block.thinking);
        continue;
      }

      // Anthropic format: may use 'signature' or other types
      // Also check for any block with a 'thinking' property regardless of type
      const anyBlock = block as unknown as Record<string, unknown>;
      if (anyBlock.thinking && typeof anyBlock.thinking === 'string') {
        thinkingBlocks.push(anyBlock.thinking);
      }
    }

    return thinkingBlocks.filter(Boolean);
  }

  return [];
}
