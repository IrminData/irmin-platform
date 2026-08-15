import { createHash } from 'node:crypto';
import { ulid } from 'ulid';

import type {
  InferenceAdapter,
  InferenceGateway,
  InferenceRunContext,
  ModelProfile,
  ModelRole,
} from './types';
import { inferenceSignal } from './types';

interface GatewayOptions {
  profile: ModelProfile;
  openRouter: InferenceAdapter;
  directAnthropic: InferenceAdapter;
  backend: 'openrouter' | 'direct-anthropic';
  canaryPercent: number;
}

export class ProfiledInferenceGateway implements InferenceGateway {
  readonly profile: ModelProfile;

  constructor(private readonly options: GatewayOptions) {
    this.profile = options.profile;
  }

  modelFor(role: ModelRole, runContext: InferenceRunContext = {}) {
    const roleProfile = this.profile.roles[role];
    const useOpenRouter = this.useOpenRouter(runContext);
    const adapter = useOpenRouter
      ? this.options.openRouter
      : this.options.directAnthropic;
    return adapter.modelFor(
      role,
      roleProfile,
      this.withPersistentTelemetry(role, runContext, useOpenRouter)
    );
  }

  async invoke<T = unknown>(
    role: ModelRole,
    messages: Parameters<InferenceGateway['invoke']>[1],
    structuredSchema?: object,
    runContext: InferenceRunContext = {}
  ): Promise<T> {
    const model = this.modelFor(role, runContext);
    const signal = inferenceSignal(this.profile, role, runContext.signal);
    if (structuredSchema) {
      return (await model
        .withStructuredOutput(structuredSchema)
        .invoke(messages, { signal })) as T;
    }
    return (await model.invoke(messages, { signal })) as T;
  }

  private useOpenRouter(runContext: InferenceRunContext): boolean {
    if (this.options.backend === 'direct-anthropic') return false;
    if (this.options.canaryPercent >= 100) return true;
    if (this.options.canaryPercent <= 0) return false;
    const key = `${runContext.workspaceSlug ?? 'system'}:${runContext.conversationId ?? 'one-shot'}`;
    const bucket =
      createHash('sha256').update(key).digest().readUInt32BE(0) % 100;
    return bucket < this.options.canaryPercent;
  }

  private withPersistentTelemetry(
    role: ModelRole,
    context: InferenceRunContext,
    expectOpenRouterCost: boolean
  ): InferenceRunContext {
    // The top-level assistant call owns the HTTP run row created by the route.
    // Middleware and one-shot role calls are separate model runs so they cannot
    // overwrite the assistant's telemetry record.
    const fallbackRunId =
      role === 'assistant' && context.runId ? context.runId : ulid();
    return {
      ...context,
      runId: fallbackRunId,
      onTelemetry: async (telemetry) => {
        const runId = telemetry.callId ?? fallbackRunId;
        try {
          const [{ db, modelRuns }, { eq }] = await Promise.all([
            import('@/database'),
            import('drizzle-orm'),
          ]);
          if (telemetry.status === 'started') {
            await db
              .insert(modelRuns)
              .values({
                runId,
                conversationId: context.conversationId,
                workspaceSlug: context.workspaceSlug ?? 'system',
                userId: context.userId ?? 'system',
                role,
                profileVersion: this.profile.version,
                requestedModel: telemetry.requestedModel,
                status: 'running',
              })
              .onConflictDoUpdate({
                target: modelRuns.runId,
                set: {
                  role,
                  profileVersion: this.profile.version,
                  requestedModel: telemetry.requestedModel,
                  updatedAt: new Date(),
                },
              });
          } else {
            await db
              .update(modelRuns)
              .set({
                requestedModel: telemetry.requestedModel,
                resolvedModel: telemetry.resolvedModel,
                resolvedProvider: telemetry.resolvedProvider,
                inputTokens: telemetry.inputTokens,
                outputTokens: telemetry.outputTokens,
                totalTokens: telemetry.totalTokens,
                fallbackIndex: telemetry.fallbackIndex,
                latencyMs: telemetry.latencyMs,
                timeToFirstTokenMs: telemetry.timeToFirstTokenMs,
                openRouterCost:
                  telemetry.cost === undefined
                    ? undefined
                    : String(telemetry.cost),
                status: telemetry.status === 'failed' ? 'failed' : 'completed',
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(modelRuns.runId, runId));
            if (expectOpenRouterCost && telemetry.status === 'completed') {
              if (telemetry.cost === undefined) {
                console.error(
                  `[InferenceTelemetry] Missing OpenRouter cost for run ${runId}`
                );
              }
              if (!telemetry.resolvedProvider) {
                console.error(
                  `[InferenceTelemetry] Missing resolved provider for run ${runId}`
                );
              }
            }
          }
        } catch (error) {
          console.error(
            '[InferenceTelemetry] Failed to persist model run',
            error
          );
        }
        await context.onTelemetry?.(telemetry);
      },
    };
  }
}
