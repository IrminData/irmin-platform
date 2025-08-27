type AssistantMessageRole = 'user' | 'assistant';

type AssistantMessageStatus = 'pending' | 'sent' | 'error' | 'failed';

type AssistantMessageContentType =
  | 'text'
  | 'thinking'
  | 'redacted_thinking'
  | 'tool_use'
  | 'server_tool_use'
  | 'web_search_tool_result'
  | 'code_execution_tool_result'
  | 'mcp_tool_use'
  | 'mcp_tool_result'
  | 'container_upload';

export interface AssistantMessage {
  id: string;
  conversation_id: string;
  role: AssistantMessageRole;
  content: string;
  content_type: AssistantMessageContentType;
  block_index?: number;
  metadata: Record<string, unknown>;
  input_tokens?: number;
  output_tokens?: number;
  ai_model: string;
  status: AssistantMessageStatus;
  error_message?: string;
  sent_at: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantConversation {
  id: string;
  title: string;
  workspace_id: string;
  user_id: string;
  metadata: Record<string, unknown>;
  messages?: AssistantMessage[];
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  estimated_tokens: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantConversationStats {
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  estimated_tokens: number;
  created_at: string;
  last_updated: string;
  duration_minutes: number;
}
