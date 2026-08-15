import { closeDatabase, db, modelRuns } from '@/database';
import { lt, sql } from 'drizzle-orm';

const retentionDays = Number(process.env.MODEL_RUN_RETENTION_DAYS ?? '90');
if (!Number.isInteger(retentionDays) || retentionDays < 1) {
  throw new Error('MODEL_RUN_RETENTION_DAYS must be a positive integer');
}

const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

db.transaction(async (transaction) => {
  await transaction.execute(sql`
    INSERT INTO model_run_daily_metrics (
      day,
      role,
      profile_version,
      requested_model,
      resolved_model,
      resolved_provider,
      status,
      run_count,
      input_tokens,
      output_tokens,
      total_tokens,
      openrouter_cost,
      total_latency_ms,
      latency_sample_count,
      total_time_to_first_token_ms,
      time_to_first_token_sample_count,
      missing_usage_count
    )
    SELECT
      completed_at::date,
      role,
      profile_version,
      COALESCE(requested_model, 'unknown'),
      COALESCE(resolved_model, 'unknown'),
      COALESCE(resolved_provider, 'unknown'),
      status,
      COUNT(*),
      COALESCE(SUM(input_tokens), 0),
      COALESCE(SUM(output_tokens), 0),
      COALESCE(SUM(total_tokens), 0),
      COALESCE(SUM(openrouter_cost), 0),
      COALESCE(SUM(latency_ms), 0),
      COUNT(latency_ms),
      COALESCE(SUM(time_to_first_token_ms), 0),
      COUNT(time_to_first_token_ms),
      COUNT(*) FILTER (
        WHERE total_tokens IS NULL
          OR openrouter_cost IS NULL
          OR resolved_provider IS NULL
      )
    FROM model_runs
    WHERE completed_at < ${cutoff}
    GROUP BY
      completed_at::date,
      role,
      profile_version,
      COALESCE(requested_model, 'unknown'),
      COALESCE(resolved_model, 'unknown'),
      COALESCE(resolved_provider, 'unknown'),
      status
    ON CONFLICT (
      day,
      role,
      profile_version,
      requested_model,
      resolved_model,
      resolved_provider,
      status
    ) DO UPDATE SET
      run_count = model_run_daily_metrics.run_count + EXCLUDED.run_count,
      input_tokens = model_run_daily_metrics.input_tokens + EXCLUDED.input_tokens,
      output_tokens = model_run_daily_metrics.output_tokens + EXCLUDED.output_tokens,
      total_tokens = model_run_daily_metrics.total_tokens + EXCLUDED.total_tokens,
      openrouter_cost = model_run_daily_metrics.openrouter_cost + EXCLUDED.openrouter_cost,
      total_latency_ms = model_run_daily_metrics.total_latency_ms + EXCLUDED.total_latency_ms,
      latency_sample_count = model_run_daily_metrics.latency_sample_count + EXCLUDED.latency_sample_count,
      total_time_to_first_token_ms = model_run_daily_metrics.total_time_to_first_token_ms
        + EXCLUDED.total_time_to_first_token_ms,
      time_to_first_token_sample_count = model_run_daily_metrics.time_to_first_token_sample_count
        + EXCLUDED.time_to_first_token_sample_count,
      missing_usage_count = model_run_daily_metrics.missing_usage_count + EXCLUDED.missing_usage_count,
      updated_at = NOW()
  `);

  return transaction
    .delete(modelRuns)
    .where(lt(modelRuns.completedAt, cutoff))
    .returning({ runId: modelRuns.runId });
})
  .then((deleted) => {
    console.log(
      `Rolled up and deleted ${deleted.length} model runs completed before ${cutoff.toISOString()}.`
    );
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => closeDatabase());
