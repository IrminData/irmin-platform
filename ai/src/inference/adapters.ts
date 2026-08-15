import { ChatAnthropic } from '@langchain/anthropic';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import { ChatOpenRouter } from '@langchain/openrouter';

import {
  InferenceTelemetryCallback,
  type ResolvedGenerationUsage,
} from './telemetryCallback';
import type {
  InferenceAdapter,
  InferenceRunContext,
  ModelRole,
  ModelRoleProfile,
} from './types';

interface OpenRouterAdapterOptions {
  apiKey: string;
  siteUrl: string;
  siteName: string;
  providerAllowlist: readonly string[];
  reviewedProviders: readonly string[];
}

interface DirectAnthropicAdapterOptions {
  apiKey: string;
}

/** Temporary rollback adapter retained only for the staged OpenRouter rollout. */
export class DirectAnthropicAdapter implements InferenceAdapter {
  constructor(private readonly options: DirectAnthropicAdapterOptions) {}

  modelFor(
    _role: ModelRole,
    roleProfile: ModelRoleProfile,
    runContext: InferenceRunContext
  ): BaseChatModel {
    const model = roleProfile.primaryModel.replace(/^anthropic\//, '');
    if (model === roleProfile.primaryModel) {
      throw new Error(
        `Direct Anthropic rollback cannot serve ${roleProfile.primaryModel}`
      );
    }
    return new ChatAnthropic({
      apiKey: this.options.apiKey,
      model,
      maxTokens: roleProfile.maxOutputTokens,
      callbacks: [
        new InferenceTelemetryCallback(
          roleProfile.primaryModel,
          runContext,
          undefined,
          [model],
          'anthropic'
        ),
      ],
    });
  }
}

export class OpenRouterAdapter implements InferenceAdapter {
  constructor(private readonly options: OpenRouterAdapterOptions) {
    const unreviewed = options.providerAllowlist.filter(
      (provider) => !options.reviewedProviders.includes(provider)
    );
    if (unreviewed.length) {
      throw new Error(
        `OpenRouter provider allowlist contains unreviewed providers: ${unreviewed.join(', ')}`
      );
    }
    if (!options.providerAllowlist.length) {
      throw new Error('OpenRouter provider allowlist cannot be empty');
    }
  }

  modelFor(
    _role: ModelRole,
    roleProfile: ModelRoleProfile,
    runContext: InferenceRunContext
  ): BaseChatModel {
    const models = [roleProfile.primaryModel, ...roleProfile.fallbackModels];
    return new ChatOpenRouter({
      apiKey: this.options.apiKey,
      model: roleProfile.primaryModel,
      models,
      route: 'fallback',
      maxTokens: roleProfile.maxOutputTokens,
      streamUsage: true,
      siteUrl: this.options.siteUrl,
      siteName: this.options.siteName,
      appCategories: ['data-platform', 'programming-app'],
      provider: {
        only: [...this.options.providerAllowlist],
        zdr: true,
        data_collection: 'deny',
        require_parameters: true,
        allow_fallbacks: false,
      },
      modelKwargs: roleProfile.capabilities.reasoning
        ? { reasoning: { enabled: true }, usage: { include: true } }
        : { usage: { include: true } },
      callbacks: [
        new InferenceTelemetryCallback(
          roleProfile.primaryModel,
          runContext,
          (generationId) =>
            this.resolveGeneration(generationId, runContext.signal),
          models
        ),
      ],
    });
  }

  private async resolveGeneration(
    generationId: string,
    signal?: AbortSignal
  ): Promise<ResolvedGenerationUsage | undefined> {
    for (const delayMs of [0, 250, 750]) {
      if (signal?.aborted) return undefined;
      if (delayMs) {
        await abortableDelay(delayMs, signal);
      }
      const response = await fetch(
        `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`,
        {
          headers: { Authorization: `Bearer ${this.options.apiKey}` },
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(5_000)])
            : AbortSignal.timeout(5_000),
        }
      );
      if (response.status === 404) continue;
      if (!response.ok) return undefined;
      const payload = (await response.json()) as {
        data?: Record<string, unknown>;
      };
      const data = payload.data ?? {};
      const inputTokens = finiteNumber(data.tokens_prompt);
      const outputTokens = finiteNumber(data.tokens_completion);
      return {
        model: typeof data.model === 'string' ? data.model : undefined,
        provider:
          typeof data.provider_name === 'string'
            ? data.provider_name
            : undefined,
        inputTokens,
        outputTokens,
        totalTokens:
          inputTokens !== undefined && outputTokens !== undefined
            ? inputTokens + outputTokens
            : undefined,
        cost: finiteNumber(data.total_cost),
      };
    }
    return undefined;
  }
}

async function abortableDelay(
  delayMs: number,
  signal?: AbortSignal
): Promise<void> {
  if (!signal) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return;
  }
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(finish, delayMs);
    signal.addEventListener('abort', finish, { once: true });
    function finish() {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', finish);
      resolve();
    }
  });
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

export class FakeInferenceAdapter implements InferenceAdapter {
  constructor(private readonly responses: readonly string[] = ['ok']) {}

  modelFor(): BaseChatModel {
    return new FakeListChatModel({
      responses: [...this.responses],
    });
  }
}
