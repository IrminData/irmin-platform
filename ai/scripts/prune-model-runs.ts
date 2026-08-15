import { closeDatabase, db, modelRuns } from '@/database';
import { lt } from 'drizzle-orm';

const retentionDays = Number(process.env.MODEL_RUN_RETENTION_DAYS ?? '90');
if (!Number.isInteger(retentionDays) || retentionDays < 1) {
  throw new Error('MODEL_RUN_RETENTION_DAYS must be a positive integer');
}

const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

db.delete(modelRuns)
  .where(lt(modelRuns.completedAt, cutoff))
  .returning({ runId: modelRuns.runId })
  .then((deleted) => {
    console.log(
      `Deleted ${deleted.length} model runs completed before ${cutoff.toISOString()}.`
    );
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => closeDatabase());
