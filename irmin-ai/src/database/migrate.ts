import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { db } from './connection';

/**
 * Run database migrations.
 * Safe to call multiple times - only applies pending migrations.
 */
export async function runMigrations(): Promise<void> {
  await migrate(db, {
    migrationsFolder: './src/database/migrations',
  });
}

// CLI entry point
async function main() {
  console.log('Running migrations...');

  try {
    await runMigrations();
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  main();
}
