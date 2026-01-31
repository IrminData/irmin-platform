/**
 * Migration script to convert existing UUIDs to ULID format.
 *
 * ULIDs are time-ordered, which improves B-tree index performance by reducing fragmentation.
 * This script generates ULIDs based on the created_at timestamp of each record to maintain
 * chronological ordering.
 *
 * Run with: pnpm migrate:ulid
 *
 * IMPORTANT: Run this script during a maintenance window and back up your database first.
 */
import { eq, sql } from 'drizzle-orm';
import { ulid } from 'ulid';

import { db } from '../src/database/connection.js';
import {
  analytics,
  conversations,
  vectorCollections,
} from '../src/database/schema.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function migrateUuidsToUlid() {
  console.log('Starting UUID to ULID migration...\n');

  // Step 1: Migrate conversations (parent table for analytics FK)
  // Since analytics.conversationId has ON DELETE CASCADE but ON UPDATE NO ACTION,
  // we must temporarily remove FK references, update the PK, then restore them.
  console.log('=== Migrating conversations ===');
  const convos = await db
    .select({ id: conversations.id, createdAt: conversations.createdAt })
    .from(conversations);

  let conversationMigrated = 0;

  for (const convo of convos) {
    if (UUID_REGEX.test(convo.id)) {
      const newId = ulid(convo.createdAt.getTime());
      const oldId = convo.id;

      // Find analytics records that reference this conversation BEFORE updating
      const affectedAnalytics = await db
        .select({ id: analytics.id })
        .from(analytics)
        .where(eq(analytics.conversationId, oldId));

      const affectedIds = affectedAnalytics.map((a) => a.id);

      await db.transaction(async (tx) => {
        // Step 1: NULL out FK references for affected analytics
        if (affectedIds.length > 0) {
          await tx.execute(
            sql`UPDATE analytics SET conversation_id = NULL WHERE conversation_id = ${oldId}`
          );
        }

        // Step 2: Update the conversation ID (PK)
        await tx.execute(
          sql`UPDATE conversations SET id = ${newId} WHERE id = ${oldId}`
        );

        // Step 3: Restore FK references with the new ULID
        if (affectedIds.length > 0) {
          for (const analyticsId of affectedIds) {
            await tx.execute(
              sql`UPDATE analytics SET conversation_id = ${newId} WHERE id = ${analyticsId}`
            );
          }
        }
      });

      conversationMigrated++;
      if (conversationMigrated % 100 === 0) {
        console.log(`  Migrated ${conversationMigrated} conversations...`);
      }
    }
  }
  console.log(`  Total conversations migrated: ${conversationMigrated}\n`);

  // Step 2: Migrate analytics IDs
  console.log('=== Migrating analytics ===');
  const analyticsRows = await db
    .select({ id: analytics.id, createdAt: analytics.createdAt })
    .from(analytics);

  let analyticsMigrated = 0;
  for (const row of analyticsRows) {
    if (UUID_REGEX.test(row.id)) {
      const newId = ulid(row.createdAt.getTime());
      await db.execute(
        sql`UPDATE analytics SET id = ${newId} WHERE id = ${row.id}`
      );
      analyticsMigrated++;
      if (analyticsMigrated % 100 === 0) {
        console.log(`  Migrated ${analyticsMigrated} analytics records...`);
      }
    }
  }
  console.log(`  Total analytics migrated: ${analyticsMigrated}\n`);

  // Step 3: Migrate vector_collections IDs
  console.log('=== Migrating vector_collections ===');
  const collections = await db
    .select({
      id: vectorCollections.id,
      createdAt: vectorCollections.createdAt,
    })
    .from(vectorCollections);

  let collectionsMigrated = 0;
  for (const col of collections) {
    if (UUID_REGEX.test(col.id)) {
      const newId = ulid(col.createdAt.getTime());
      await db.execute(
        sql`UPDATE vector_collections SET id = ${newId} WHERE id = ${col.id}`
      );
      collectionsMigrated++;
    }
  }
  console.log(`  Total collections migrated: ${collectionsMigrated}\n`);

  // Summary
  console.log('=== Migration Summary ===');
  console.log(`  Conversations: ${conversationMigrated}`);
  console.log(`  Analytics: ${analyticsMigrated}`);
  console.log(`  Vector Collections: ${collectionsMigrated}`);
  console.log('\nMigration complete!');

  process.exit(0);
}

migrateUuidsToUlid().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
