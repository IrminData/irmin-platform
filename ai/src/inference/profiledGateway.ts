import type {
  InferenceAdapter,
  InferenceGateway,
  InferenceRunContext,
  ModelProfile,
  ModelRole,
} from './types';

interface GatewayOptions {
  profile: ModelProfile;
  adapter: InferenceAdapter;
}

export class ProfiledInferenceGateway implements InferenceGateway {
  readonly profile: ModelProfile;

  constructor(private readonly options: GatewayOptions) {
    this.profile = options.profile;
  }

  modelFor(role: ModelRole, runContext: InferenceRunContext = {}) {
    const roleProfile = this.profile.roles[role];
    return this.options.adapter.modelFor(
      role,
      roleProfile,
      this.withPersistentTelemetry(role, runContext)
    );
  }

  async invoke<T = unknown>(
    role: ModelRole,
    messages: Parameters<InferenceGateway['invoke']>[1],
    structuredSchema?: object,
    runContext: InferenceRunContext = {}
  ): Promise<T> {
    const model = this.modelFor(role, runContext);
    const timeoutSignal = AbortSignal.timeout(
      this.profile.roles[role].timeoutMs
    );
    const signal = runContext.signal
      ? AbortSignal.any([runContext.signal, timeoutSignal])
      : timeoutSignal;
    if (structuredSchema) {
      return (await model
        .withStructuredOutput(structuredSchema)
        .invoke(messages, { signal })) as T;
    }
    return (await model.invoke(messages, { signal })) as T;
  }

  private withPersistentTelemetry(
    role: ModelRole,
    context: InferenceRunContext
  ): InferenceRunContext {
    return {
      ...context,
      onTelemetry: async (telemetry) => {
        const modelCallId = telemetry.modelCallId;
        try {
          const [{ db, modelRuns }, { eq }] = await Promise.all([
            import('@/database'),
            import('drizzle-orm'),
          ]);
          if (telemetry.status === 'started') {
            await db.insert(modelRuns).values({
              runId: modelCallId,
              parentRunId: context.runId,
              conversationId: context.conversationId,
              workspaceSlug: context.workspaceSlug ?? 'system',
              userId: context.userId ?? 'system',
              role,
              profileVersion: this.profile.version,
              requestedModel: telemetry.requestedModel,
              status: 'running',
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
              .where(eq(modelRuns.runId, modelCallId));
            if (telemetry.status === 'completed') {
              if (
                telemetry.backend === 'openrouter' &&
                telemetry.cost === undefined
              ) {
                console.error(
                  `[InferenceTelemetry] Missing OpenRouter cost for model call ${modelCallId}`
                );
              }
              if (!telemetry.resolvedProvider) {
                console.error(
                  `[InferenceTelemetry] Missing resolved provider for model call ${modelCallId}`
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
        try {
          await context.onTelemetry?.(telemetry);
        } catch (error) {
          console.error('[InferenceTelemetry] Consumer callback failed', error);
        }
      },
    };
  }
}
