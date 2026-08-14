import { closeDatabase, conversations, db } from '@/database';
import { sql } from 'drizzle-orm';

const REQUIRED_ACKNOWLEDGEMENT = 'RESET_IRMIN_PRELAUNCH_AI_DATA';

async function main() {
  if (process.env.IRMIN_PRELAUNCH_RESET_ACK !== REQUIRED_ACKNOWLEDGEMENT) {
    throw new Error(
      `Refusing reset. Set IRMIN_PRELAUNCH_RESET_ACK=${REQUIRED_ACKNOWLEDGEMENT} to acknowledge permanent deletion.`
    );
  }

  await db.transaction(async (transaction) => {
    await transaction.execute(sql`
      DO $$
      BEGIN
        IF to_regclass('public.checkpoint_writes') IS NOT NULL THEN
          EXECUTE 'DELETE FROM checkpoint_writes';
        END IF;
        IF to_regclass('public.checkpoints') IS NOT NULL THEN
          EXECUTE 'DELETE FROM checkpoints';
        END IF;
        IF to_regclass('public.checkpoint_blobs') IS NOT NULL THEN
          EXECUTE 'DELETE FROM checkpoint_blobs';
        END IF;
      END $$;
    `);
    await transaction.delete(conversations);
  });
  console.log(
    'Pre-launch AI conversations, runs, feedback, and checkpoints reset.'
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => closeDatabase());
