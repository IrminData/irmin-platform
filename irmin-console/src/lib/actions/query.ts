'use server';

import { initCore } from '@/lib/initCore';

import { IrminFileType } from '@/types/core/Bucket';
import { CollectionType } from '@/types/core/Collection';

/**
 * Server action to execute a script once.
 */
export async function executeScript(
  type: IrminFileType,
  content: string,
  exampleType?: CollectionType
) {
  const irminCore = await initCore();
  const res = await irminCore.queryService.executeScript(
    type,
    content,
    exampleType
  );
  return res;
}
