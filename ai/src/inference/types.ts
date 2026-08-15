import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessageLike } from '@langchain/core/messages';

export type ModelRole =
  | 'assistant'
  | 'query'
  | 'scripting'
  | 'tool_selector'
  | 'summarizer'
  | 'title'
  | 'hyde';

interface ModelCapabilities {
  tools: boolean;
  structuredOutput: boolean;
  reasoning: boolean;
  contextSize: number;
}

export interface ModelRoleProfile {
  primaryModel: string;
  fallbackModels: readonly string[];
  capabilities: ModelCapabilities;
  maxInputTokens: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export interface ModelProfile {
  id: string;
  version: string;
  providerAllowlist: readonly string[];
  privacy: {
    zdrRequired: true;
    dataCollection: 'deny';
  };
  roles: Readonly<Record<ModelRole, ModelRoleProfile>>;
}

export interface InferenceTelemetry {
  modelCallId: string;
  backend: 'openrouter' | 'anthropic';
  requestedModel: string;
  resolvedModel?: string;
  resolvedProvider?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  fallbackIndex?: number;
  latencyMs?: number;
  timeToFirstTokenMs?: number;
  status: 'started' | 'completed' | 'failed';
}

export interface InferenceRunContext {
  workspaceSlug?: string;
  conversationId?: string;
  runId?: string;
  userId?: string;
  signal?: AbortSignal;
  onTelemetry?: (telemetry: InferenceTelemetry) => void | Promise<void>;
}

export interface InferenceAdapter {
  modelFor(
    role: ModelRole,
    roleProfile: ModelRoleProfile,
    runContext: InferenceRunContext
  ): BaseChatModel;
}

export interface InferenceGateway {
  readonly profile: ModelProfile;
  modelFor(role: ModelRole, runContext?: InferenceRunContext): BaseChatModel;
  invoke<T = unknown>(
    role: ModelRole,
    messages: BaseMessageLike[],
    structuredSchema?: object,
    runContext?: InferenceRunContext
  ): Promise<T>;
}

/** Compose caller cancellation with a role's version-controlled timeout. */
export function inferenceSignal(
  profile: ModelProfile,
  role: ModelRole,
  callerSignal?: AbortSignal
): AbortSignal {
  const timeout = AbortSignal.timeout(profile.roles[role].timeoutMs);
  return callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;
}
