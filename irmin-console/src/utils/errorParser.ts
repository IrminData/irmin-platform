import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

/**
 * Parse the errors from the Core API response
 *
 * Throws error if the response contains errors.
 * Used by the Core API services.
 *
 * @param res - Core API response object
 */
export const handleCoreAPIErrors = (res: IrminAPIResponse) => {
  let message = '';
  if (res.errors && res.errors.length > 0) {
    message = res.errors.join('\n');
  }
  if (message.length > 0) {
    throw new Error(message);
  }
};
