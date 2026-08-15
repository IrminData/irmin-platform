import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { LLMResult } from '@langchain/core/outputs';
import { ulid } from 'ulid';

import type { InferenceRunContext, InferenceTelemetry } from './types';

export interface ResolvedGenerationUsage {
  model?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export class InferenceTelemetryCallback extends BaseCallbackHandler {
  name = 'irmin_inference_telemetry';
  private startedAt?: number;
  private firstTokenAt?: number;
  private modelCallId = ulid();

  constructor(
    private readonly requestedModel: string,
    private readonly context: InferenceRunContext,
    private readonly resolveGeneration?: (
      generationId: string
    ) => Promise<ResolvedGenerationUsage | undefined>,
    private readonly orderedModels: readonly string[] = [requestedModel],
    private readonly backend: InferenceTelemetry['backend'] = 'openrouter'
  ) {
    super();
  }

  override async handleLLMStart() {
    this.modelCallId = ulid();
    this.startedAt = Date.now();
    this.firstTokenAt = undefined;
    await this.emit({
      modelCallId: this.modelCallId,
      backend: this.backend,
      requestedModel: this.requestedModel,
      status: 'started',
    });
  }

  override async handleLLMNewToken() {
    this.firstTokenAt ??= Date.now();
  }

  override async handleLLMEnd(output: LLMResult) {
    const llmOutput = record(output.llmOutput);
    const tokenUsage = record(llmOutput.tokenUsage);
    const generation = record(output.generations[0]?.[0]);
    const message = record(generation.message);
    const responseMetadata = record(message.response_metadata);
    const usageMetadata = record(message.usage_metadata);
    const generationId =
      typeof message.id === 'string' ? message.id : undefined;
    let resolved: ResolvedGenerationUsage | undefined;
    if (generationId && this.resolveGeneration) {
      try {
        resolved = await this.resolveGeneration(generationId);
      } catch (error) {
        console.error(
          `[InferenceTelemetry] Failed to resolve OpenRouter generation ${generationId}`,
          error
        );
      }
    }
    await this.emit({
      modelCallId: this.modelCallId,
      backend: this.backend,
      requestedModel: this.requestedModel,
      resolvedModel:
        resolved?.model ??
        (typeof responseMetadata.model === 'string'
          ? responseMetadata.model
          : undefined),
      resolvedProvider:
        resolved?.provider ??
        (typeof responseMetadata.provider_name === 'string'
          ? responseMetadata.provider_name
          : this.backend === 'anthropic'
            ? 'Anthropic Direct'
            : undefined),
      inputTokens:
        resolved?.inputTokens ??
        number(
          tokenUsage.prompt_tokens ??
            tokenUsage.input_tokens ??
            usageMetadata.input_tokens
        ),
      outputTokens:
        resolved?.outputTokens ??
        number(
          tokenUsage.completion_tokens ??
            tokenUsage.output_tokens ??
            usageMetadata.output_tokens
        ),
      totalTokens:
        resolved?.totalTokens ??
        number(tokenUsage.total_tokens ?? usageMetadata.total_tokens),
      cost: resolved?.cost ?? number(tokenUsage.cost ?? llmOutput.cost),
      fallbackIndex: resolved?.model
        ? Math.max(0, this.orderedModels.indexOf(resolved.model))
        : 0,
      latencyMs:
        this.startedAt === undefined ? undefined : Date.now() - this.startedAt,
      timeToFirstTokenMs:
        this.startedAt === undefined || this.firstTokenAt === undefined
          ? undefined
          : this.firstTokenAt - this.startedAt,
      status: 'completed',
    });
  }

  override async handleLLMError() {
    await this.emit({
      modelCallId: this.modelCallId,
      backend: this.backend,
      requestedModel: this.requestedModel,
      latencyMs:
        this.startedAt === undefined ? undefined : Date.now() - this.startedAt,
      timeToFirstTokenMs:
        this.startedAt === undefined || this.firstTokenAt === undefined
          ? undefined
          : this.firstTokenAt - this.startedAt,
      status: 'failed',
    });
  }

  private async emit(telemetry: InferenceTelemetry) {
    await this.context.onTelemetry?.(telemetry);
  }
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}
