// Export database connection
export { closeDatabase, db } from './connection';

// Export migration function
export { runMigrations } from './migrate';

// Export schema types and tables
export * from './schema';
