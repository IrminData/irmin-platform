import { IrminFileType } from '@/types/api/Bucket';
import { CollectionData } from '@/types/api/Collection';

/**
 * The type of body request to the `POST /api/action-single-run` route
 * @typeParam type - The type of file to run the action on
 * @typeParam content - The content of the file to run the action on
 * @typeParam branch - The branch to run the action on
 */
export type ActionSingleRunRequest = {
  type: IrminFileType;
  content: string;
  branch: string | null;
};

/**
 * @typeParam result - The fetched data
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.message - A message about the fetch
 * @typeParam metadata.timeTaken - The time taken to fetch the data in seconds
 * @typeParam metadata.rowsReturned - The number of rows returned
 */
export interface ActionSingleRunResult {
  result: CollectionData | null;
  metadata: {
    message: string;
    timeTaken: number;
    rowsReturned: number;
  };
}

/**
 * Response object type for the `POST /api/action-single-run` route
 * @typeParam data - The fetched data {@link ActionSingleRunResult}
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.errors - Errors that occurred during the fetch
 * @typeParam metadata.workspace - Slug of the workspace data was fetched for
 */
export interface ActionSingleRunResponse {
  data: ActionSingleRunResult;
  metadata: {
    errors: string[];
    workspace: string;
  };
}

/**
 * Empty {@link ActionSingleRunResponse} object to use as a base for the response
 */
export const emptyActionSingleRunResponse: ActionSingleRunResponse = {
  data: {
    result: null,
    metadata: {
      message: 'Data fetched successfully',
      timeTaken: 0,
      rowsReturned: 0,
    },
  },
  metadata: {
    errors: [],
    workspace: '',
  },
};
