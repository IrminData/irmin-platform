import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/config/env';

import * as schema from './schema';

// Configure postgres client with connection pooling and safety settings
const client = postgres(env.DATABASE_URL, {
  // Connection pool settings
  max: 10, // Maximum connections in pool
  idle_timeout: 300, // Close idle connections after 5 minutes (seconds)
  connect_timeout: 10, // Connection timeout (seconds)
  // Note: statement_timeout is not set as a startup parameter because some managed
  // PostgreSQL services (Supabase, Neon, etc.) don't support it. If needed, set it
  // via SQL: SET statement_timeout = '30s' after connection.
});

export const db = drizzle(client, { schema });

/**
 * Close the database connection pool.
 * Should be called during graceful shutdown.
 */
export async function closeDatabase(): Promise<void> {
  await client.end();
}
