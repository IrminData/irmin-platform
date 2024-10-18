import { NextRequest, NextResponse } from 'next/server';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import { transformBucketToFileNavItem } from '@/utils/bucket';
import removeCircularJSON from '@/utils/removeCircularJSON';

import {
  BucketProxyData,
  BucketProxyResponse,
  emptyBucketProxyResponse,
} from './types';

/**
 * Proxy route: Get the bucket and file navigator items for a workspace from Core Irmin API, on the server
 *
 * Can be accessed at `GET /api/bucket`
 *
 * Uses the {@link IrminCore} for auth and data fetching
 *
 * Fetches all the data in parallel and waits for all the promises to resolve.
 * Returns a JSON object {@link BucketProxyResponse} with all the data and any errors.
 */
export async function GET(req: NextRequest) {
  // Get the token from the Authorization header
  const token = req.headers.get('Authorization');
  if (!token || !token.startsWith('Bearer ') || token === 'Bearer ') {
    return new NextResponse('Missing required headers', { status: 401 });
  }
  const usableToken = token.replace('Bearer ', '');

  // Get locale from the Accept-Language header
  const locale = (req.headers.get('Accept-Language') ?? 'en') as Locale;

  // Create an instance of the Irmin Core
  const { profileService, workspaceService, bucketService } = new IrminCore(
    locale,
    usableToken
  );

  // Get the workspace to fetch
  const workspaceSlug = req.headers.get('Workspace');
  if (!workspaceSlug) {
    return new NextResponse('No workspace', { status: 401 });
  }

  // Validate the token by fetching the /profile endpoint
  const profile = await profileService.getProfile();
  if (!profile || !profile.data.email) {
    return new NextResponse('Unauthorised', { status: 401 });
  }

  // Check if the user is authorised to access the workspace
  const workspaces = await workspaceService.fetchWorkspaces();
  if (!workspaces) {
    return new NextResponse('No workspaces', { status: 401 });
  }
  if (!workspaces.data.find((w) => w.slug === workspaceSlug)) {
    return new NextResponse('Not authorised for this workspace', {
      status: 404,
    });
  }

  // Create an empty response object
  const bucketProxyRes: BucketProxyResponse = {
    ...emptyBucketProxyResponse,
    metadata: {
      errors: [],
      workspace: workspaceSlug,
    },
  };

  try {
    // Set users current workspace to what was passed in the headers
    await workspaceService.switchWorkspace(workspaceSlug);

    // Construct an array of promises to fetch all the data
    const promises = {
      bucket: bucketService.fetchBucket,
    };
    // Fetch all data and wait for all the promises to resolve
    const results = await Promise.allSettled(
      Object.values(promises).map((p) => p())
    );
    // Assign the results to the appropriate property
    results.map((res, i) => {
      // Find which function was executed by the index of the promise
      const objectKey = Object.keys(promises)[i] as keyof BucketProxyData;
      // Handle the promise result
      if (res.status === 'rejected') {
        // If the promise was rejected, add the error to the errors array
        bucketProxyRes.metadata.errors.push({
          error: res.reason,
          object: objectKey,
        });
        return;
      }
      if (res.status === 'fulfilled') {
        // If the promise was fulfilled, assign the data to the appropriate property
        const data = res.value?.data ?? [];
        bucketProxyRes.data[objectKey] = removeCircularJSON(data);
      }
    });
  } catch (error) {
    // Log the error, but don't throw it
    console.error('GET /api/bucket error', error);
  } finally {
    // Switch back to the original workspace
    if (profile?.data?.workspace?.slug)
      workspaceService.switchWorkspace(profile.data.workspace.slug);
  }

  // Transform the bucket data into file navigator items
  bucketProxyRes.data.fileNavItems = transformBucketToFileNavItem(
    bucketProxyRes.data.bucket
  );

  // Return the full data as JSON
  return new NextResponse(JSON.stringify(bucketProxyRes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
