import { type NextRequest } from 'next/server';

import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import { exampleBranches } from '@/types/examples/exampleBranches';

import { BranchesResponse, emptyBranchesResponse } from './types';

/**
 * GET /api/branches?repository=repo1
 *
 * Endpoint to get the branches for a single repository
 */
export async function GET(req: NextRequest) {
  // Get the token from the Authorization header
  const token = req.headers.get('Authorization');
  if (!token || !token.startsWith('Bearer ') || token === 'Bearer ') {
    return new Response('Missing required headers', { status: 401 });
  }
  const usableToken = token.replace('Bearer ', '');

  // Get locale from the Accept-Language header
  const locale = (req.headers.get('Accept-Language') ?? 'en') as Locale;

  // Create an instance of the Irmin Core
  const { profileService, workspaceService } = new IrminCore(
    locale,
    usableToken
  );

  // Get the workspace to fetch
  const workspaceSlug = req.headers.get('Workspace');
  if (!workspaceSlug) {
    return new Response('No workspace', { status: 401 });
  }

  // Validate the token by fetching the /profile endpoint
  const profile = await profileService.getProfile();
  if (!profile || !profile.data.email) {
    return new Response('Unauthorised', { status: 401 });
  }

  // Check if the user is authorised to access the workspace
  const workspaces = await workspaceService.fetchWorkspaces();
  if (!workspaces) {
    return new Response('No workspaces', { status: 401 });
  }
  if (!workspaces.data.find((w) => w.slug === workspaceSlug)) {
    return new Response('Not authorised for this workspace', { status: 404 });
  }

  // Get the request properties
  const searchParams = req.nextUrl.searchParams;
  const requestRepository = searchParams.get('repository');
  if (!searchParams || !requestRepository) {
    return new Response('Invalid request', { status: 400 });
  }

  // Create an empty response object
  const branchesRes: BranchesResponse = {
    ...emptyBranchesResponse,
    metadata: {
      errors: [],
      workspace: workspaceSlug,
      repository: requestRepository,
    },
  };

  try {
    // Set users current workspace to what was passed in the headers
    await workspaceService.switchWorkspace(workspaceSlug);

    // TODO: Get the branches for the requested repository from the API
    // For now, just set some fake data
    branchesRes.data.branches = [...exampleBranches];
  } catch (error) {
    // Log the error, but don't throw it
    console.error('GET /api/branches', error);
  } finally {
    // Switch back to the original workspace
    if (profile?.data?.workspace?.slug)
      workspaceService.switchWorkspace(profile.data.workspace.slug);
  }

  // Return the full data as JSON
  return new Response(JSON.stringify(branchesRes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
