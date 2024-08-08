import { transformBucketToFileNavItem } from '@/utils/bucket';

import { Bucket } from '@/types/api/Bucket';
import { exampleBucket } from '@/types/examples/base';
import { FileNavigatorItem } from '@/types/internal/FileNavigatorItem';

/**
 * @typeParam bucket - The bucket data
 * @typeParam fileNavItems - The transformed bucket data into file navigator items
 */
export interface BucketProxyData {
  bucket: Bucket;
  fileNavItems: FileNavigatorItem[];
}

/**
 * Response object type for the `GET /api/bucket` route
 * @typeParam data - The fetched data {@link BucketProxyData}
 * @typeParam metadata - Additional data about the fetch
 * @typeParam metadata.errors - Errors that occurred during the fetch
 * @typeParam metadata.errors.error - The error object
 * @typeParam metadata.errors.object - The object that the error occurred on
 * @typeParam metadata.workspace - Slug of the workspace data was fetched for
 */
export interface BucketProxyResponse {
  data: BucketProxyData;
  metadata: {
    errors: {
      error: Error;
      object: keyof BucketProxyData;
    }[];
    workspace: string;
  };
}

/**
 * Empty {@link BucketProxyResponse} object to use as a base for the response
 */
export const emptyBucketProxyResponse: BucketProxyResponse = {
  data: {
    bucket: exampleBucket,
    fileNavItems: transformBucketToFileNavItem(exampleBucket),
  },
  metadata: {
    errors: [],
    workspace: '',
  },
};
