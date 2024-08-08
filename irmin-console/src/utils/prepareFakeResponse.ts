/* eslint-disable @typescript-eslint/no-explicit-any */
import removeCircularJSON from '@/utils/removeCircularJSON';

import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';
import { exampleAPIResponse } from '@/types/examples/core';

/**
 * Prepare an example object for the API response
 *
 * This is used to correctly format fake API data in services.
 * Will remove any circular JSON references and convert to {@link IrminAPIResponse} structure
 *
 * @param example - The example object to prepare
 * @returns The prepared example object
 */
export default function prepareFakeResponse(example?: any): IrminAPIResponse {
  if (!example || typeof example !== 'object') {
    return exampleAPIResponse;
  }
  return {
    ...exampleAPIResponse,
    data: removeCircularJSON(example),
  };
}
