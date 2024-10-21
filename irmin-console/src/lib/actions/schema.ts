import { initCore } from '@/lib/initCore';

/**
 * Server action to fetch schemas for a list of collections at a specific ref.
 */
export async function fetchSchemas(collections: string[], ref: string) {
  const irminCore = await initCore();
  const res = await irminCore.schemaService.fetchSchema(collections, ref);
  return res.data;
}
