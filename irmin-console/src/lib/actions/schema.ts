'use server';

import { initCore } from '@/lib/initCore';

/**
 * Server action to fetch schemas for a list of collections at a specific ref.
 */
export async function fetchSchemas(
  collections: string[],
  repository: string,
  ref: string,
  token?: string
) {
  // Create the IrminCore instance
  const irminCore = await initCore(token);
  const res = await irminCore.schemaService.fetchSchemas(
    collections,
    repository,
    ref
  );
  return res.data;
}
