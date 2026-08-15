/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenRouter } from '@langchain/openrouter';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FakeInferenceAdapter, OpenRouterAdapter } from './adapters';
import { ProfiledInferenceGateway } from './profiledGateway';
import {
  assertReviewedModelProfile,
  BASELINE_MODEL,
  MODEL_PROFILE,
  REVIEWED_ZDR_PROVIDER_CONFIGS,
  REVIEWED_ZDR_PROVIDERS,
} from './profiles';
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

  it('rejects unreviewed providers', () => {
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
  });

  it('keeps complete review records for every admitted provider', () => {
    assert.deepEqual(
      REVIEWED_ZDR_PROVIDER_CONFIGS.map(({ name }) => name),
      REVIEWED_ZDR_PROVIDERS
    );
    for (const provider of REVIEWED_ZDR_PROVIDER_CONFIGS) {
      assert.match(provider.zdrEvidence, /^https:/);
      assert.match(provider.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(provider.operator.length > 0);
      assert.ok(provider.capabilities.length > 0);
      assert.ok(provider.rollbackOwner.length > 0);
    }
  });

  it('routes every role through the configured OpenRouter adapter', () => {
    const openRouter = new TrackingAdapter();
    const gateway = new ProfiledInferenceGateway({
      profile: MODEL_PROFILE,
      openRouter,
    });
    const context = { workspaceSlug: 'acme', conversationId: 'conversation-1' };
    gateway.modelFor('assistant', context);
    gateway.modelFor('query', { workspaceSlug: 'acme' });
    assert.deepEqual(openRouter.roles, ['assistant', 'query']);
  });

  it('keeps unevaluated candidates out of the active profile', () => {
    for (const role of Object.values(MODEL_PROFILE.roles)) {
      assert.equal(role.primaryModel, BASELINE_MODEL);
      assert.deepEqual(role.fallbackModels, []);
    }
  });

  it('rejects an unreviewed model or fallback before startup', () => {
    const profile = {
      ...MODEL_PROFILE,
      roles: {
        ...MODEL_PROFILE.roles,
        assistant: {
          ...MODEL_PROFILE.roles.assistant,
          fallbackModels: ['vendor/unreviewed-model'],
        },
      },
    };
    assert.throws(() => assertReviewedModelProfile(profile), /unreviewed/);
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
});
