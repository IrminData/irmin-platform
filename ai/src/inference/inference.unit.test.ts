/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenRouter } from '@langchain/openrouter';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DirectAnthropicAdapter,
  FakeInferenceAdapter,
  OpenRouterAdapter,
} from './adapters';
import { ProfiledInferenceGateway } from './profiledGateway';
import { MODEL_PROFILE, REVIEWED_ZDR_PROVIDERS } from './profiles';
import { InferenceTelemetryCallback } from './telemetryCallback';
import type { InferenceAdapter, InferenceTelemetry, ModelRole } from './types';

class TrackingAdapter implements InferenceAdapter {
  readonly roles: ModelRole[] = [];
  private readonly fake = new FakeInferenceAdapter();

  modelFor(role: ModelRole): BaseChatModel {
    this.roles.push(role);
    return this.fake.modelFor();
  }
}

describe('inference gateway', () => {
  it('installs strict OpenRouter privacy and fallback routing', () => {
    const adapter = new OpenRouterAdapter({
      apiKey: 'test',
      siteUrl: 'https://irmin.co',
      siteName: 'Irmin',
      providerAllowlist: REVIEWED_ZDR_PROVIDERS,
      reviewedProviders: REVIEWED_ZDR_PROVIDERS,
    });
    const model = adapter.modelFor(
      'assistant',
      MODEL_PROFILE.roles.assistant,
      {}
    ) as ChatOpenRouter;

    assert.deepEqual(model.models, [
      MODEL_PROFILE.roles.assistant.primaryModel,
      ...MODEL_PROFILE.roles.assistant.fallbackModels,
    ]);
    assert.equal(model.route, 'fallback');
    assert.equal(model.provider?.zdr, true);
    assert.equal(model.provider?.data_collection, 'deny');
    assert.equal(model.provider?.require_parameters, true);
    assert.equal(model.provider?.allow_fallbacks, false);
  });

  it('rejects unreviewed providers and missing rollback credentials', () => {
    assert.throws(
      () =>
        new OpenRouterAdapter({
          apiKey: 'test',
          siteUrl: 'https://irmin.co',
          siteName: 'Irmin',
          providerAllowlist: ['Unreviewed Cloud'],
          reviewedProviders: REVIEWED_ZDR_PROVIDERS,
        }),
      /unreviewed providers/
    );
    assert.throws(
      () =>
        new DirectAnthropicAdapter().modelFor(
          'assistant',
          MODEL_PROFILE.roles.assistant,
          {}
        ),
      /ANTHROPIC_API_KEY/
    );
  });

  it('selects canary backends deterministically by workspace and conversation', () => {
    const openRouter = new TrackingAdapter();
    const direct = new TrackingAdapter();
    const gateway = new ProfiledInferenceGateway({
      profile: MODEL_PROFILE,
      openRouter,
      directAnthropic: direct,
      backend: 'openrouter',
      canaryPercent: 50,
    });
    const context = { workspaceSlug: 'acme', conversationId: 'conversation-1' };
    gateway.modelFor('assistant', context);
    gateway.modelFor('assistant', context);

    assert.ok(openRouter.roles.length === 2 || direct.roles.length === 2);
    assert.equal(openRouter.roles.length + direct.roles.length, 2);
  });

  it('honors the emergency direct-Anthropic backend override', () => {
    const openRouter = new TrackingAdapter();
    const direct = new TrackingAdapter();
    const gateway = new ProfiledInferenceGateway({
      profile: MODEL_PROFILE,
      openRouter,
      directAnthropic: direct,
      backend: 'direct-anthropic',
      canaryPercent: 100,
    });
    gateway.modelFor('query', { workspaceSlug: 'acme' });
    assert.deepEqual(direct.roles, ['query']);
    assert.deepEqual(openRouter.roles, []);
  });

  it('uses exact generation metadata for provider, tokens, and cost', async () => {
    const telemetry: InferenceTelemetry[] = [];
    const callback = new InferenceTelemetryCallback(
      'requested-model',
      { onTelemetry: (event) => void telemetry.push(event) },
      async (generationId) => ({
        model: `resolved:${generationId}`,
        provider: 'Reviewed Provider',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        cost: 0.001,
      })
    );
    await callback.handleLLMEnd?.({
      generations: [[{ message: { id: 'generation-1' } }]],
    } as never);

    assert.deepEqual(telemetry.at(-1), {
      requestedModel: 'requested-model',
      resolvedModel: 'resolved:generation-1',
      resolvedProvider: 'Reviewed Provider',
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      cost: 0.001,
      fallbackIndex: 0,
      latencyMs: undefined,
      timeToFirstTokenMs: undefined,
      status: 'completed',
    });
  });

  it('resets first-token timing for every invocation', async () => {
    const telemetry: InferenceTelemetry[] = [];
    const callback = new InferenceTelemetryCallback('requested-model', {
      onTelemetry: (event) => void telemetry.push(event),
    });
    const originalNow = Date.now;
    let now = 100;
    Date.now = () => now;
    try {
      await callback.handleLLMStart?.();
      now = 110;
      await callback.handleLLMNewToken?.();
      now = 120;
      await callback.handleLLMEnd?.({ generations: [[]] } as never);
      now = 200;
      await callback.handleLLMStart?.();
      now = 230;
      await callback.handleLLMNewToken?.();
      now = 240;
      await callback.handleLLMEnd?.({ generations: [[]] } as never);
    } finally {
      Date.now = originalNow;
    }
    const completed = telemetry.filter((event) => event.status === 'completed');
    assert.deepEqual(
      completed.map((event) => event.timeToFirstTokenMs),
      [10, 30]
    );
    assert.equal(new Set(completed.map((event) => event.callId)).size, 2);
  });
});
