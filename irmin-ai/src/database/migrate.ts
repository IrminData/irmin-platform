import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './connection';

async function main() {
  console.log('Running migrations...');

  try {
    await migrate(db, {
      migrationsFolder: './src/database/migrations',
    });

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  main();
}
