import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import { placeholderData } from '@/types/examples/datatableData';

import {
  ActionSingleRunRequest,
  ActionSingleRunResponse,
  emptyActionSingleRunResponse,
} from './types';

/**
 * API endpoint to run an action once and receive the results
 */
export async function POST(req: Request) {
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
  const runRequest: ActionSingleRunRequest = await req.json();
  if (!runRequest || !runRequest.content || !runRequest.type) {
    return new Response('Invalid request', { status: 400 });
  }

  // Create an empty response object
  const actionSingleRunRes: ActionSingleRunResponse = {
    ...emptyActionSingleRunResponse,
    metadata: {
      errors: [],
      workspace: workspaceSlug,
    },
  };

  try {
    // Set users current workspace to what was passed in the headers
    await workspaceService.switchWorkspace(workspaceSlug);

    // TODO: Run the action and get the results
    // For now, just set some fake data
    actionSingleRunRes.data.result = placeholderData;
    actionSingleRunRes.data.metadata.timeTaken = 0.1;
    actionSingleRunRes.data.metadata.rowsReturned = placeholderData.length;
    actionSingleRunRes.data.metadata.message = 'Placeholder data returned';
  } catch (error) {
    // Log the error, but don't throw it
    console.error('POST /api/action-single-run error', error);
  } finally {
    // Switch back to the original workspace
    if (profile?.data?.workspace?.slug)
      workspaceService.switchWorkspace(profile.data.workspace.slug);
  }

  // Return the full data as JSON
  return new Response(JSON.stringify(actionSingleRunRes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
