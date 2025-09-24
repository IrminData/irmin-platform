// Server streaming event types (matching actual server format)
interface ServerTextEvent {
  type: 'text-start' | 'text-delta' | 'text-end';
  id?: string;
  delta?: string;
}

export interface ServerToolEvent {
  type: 'tool-input-start' | 'tool-input-available' | 'tool-output-available';
  toolCallId?: string;
  toolName?: string;
  input?: Record<string, unknown>;
  output?: string;
}

export interface ServerReasoningEvent {
  type: 'reasoning-start' | 'reasoning-delta' | 'reasoning-end';
  id?: string;
  delta?: string;
}

interface ServerSystemEvent {
  type: 'system';
  content?: string;
}

interface ServerSourceEvent {
  type: 'source';
  content?: string;
}

interface ServerCompletionEvent {
  type: 'stream-complete';
}

interface ServerErrorEvent {
  type: 'stream-error' | 'error';
  error?: string;
  content?: string;
}

export type ServerStreamEvent =
  | ServerTextEvent
  | ServerToolEvent
  | ServerReasoningEvent
  | ServerSystemEvent
  | ServerSourceEvent
  | ServerCompletionEvent
  | ServerErrorEvent;

// Component props
export interface AgentChatProps {
  conversationID?: string | null;
  agentId?: string; // Which agent to use (defaults to 'assistant' - general assistant)
  onConversationCreated?: (conversationId: string) => void; // Callback when new conversation is created
  onConversationUpdated?: (conversationId: string) => void; // Callback when conversation data is updated (e.g., title generation)
}

// Message action state
interface MessageActionState {
  liked?: boolean;
  disliked?: boolean;
}

export type MessageActions = Record<string, MessageActionState>;

// Tool call types for stored messages
export interface StoredToolCall {
  name: string;
  args?: Record<string, unknown>;
  output?: string;
}

// Current tool call during streaming
export interface CurrentToolCall {
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  output?: string;
}

// Current reasoning during streaming
export interface CurrentReasoning {
  id?: string;
  content: string;
}
