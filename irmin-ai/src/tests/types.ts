// Test-specific types and utilities

// Re-export actual types from codebase
export type { ChatRequest } from '@/types/chat';
export type { ConversationRequest } from '@/types/conversation';
export type { AgentConfig } from '@/agents/types';

// Test-specific interfaces
export interface TestConfig {
  timeout: number;
  retries: number;
  delay: number;
}

export interface TestResult {
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  data: unknown;
  error: string | null;
  stream?: ReadableStream<Uint8Array> | null;
}

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
}
