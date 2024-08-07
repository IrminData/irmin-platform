import { Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import removeCircularJSON from '@/utils/removeCircularJSON';

import {
  emptyWorkspaceProxyResponse,
  WorkspaceProxyData,
  WorkspaceProxyResponse,
} from './types';

/**
 * Proxy route: Get related data for the user's current workspace from Core Irmin API, on the server
 *
 * Can be accessed at `GET /api/workspace`
 *
 * Uses the {@link IrminCore} for auth and data fetching
 *
 * Fetches all the data in parallel and waits for all the promises to resolve.
 * Returns a JSON object {@link WorkspaceProxyResponse} with all the data and any errors.
 */
export async function GET(req: Request) {
  // Get the token from the Authorization header
  const token = req.headers.get('Authorization');
  if (!token || !token.startsWith('Bearer ') || token === 'Bearer ') {
    return new Response('Missing required headers', { status: 401 });
  }
  const usableToken = token.replace('Bearer ', '');

  // Get locale from the Accept-Language header
  const locale = (req.headers.get('Accept-Language') ?? 'en') as Locale;

  // Create an instance of the Irmin Core
  const {
    profileService,
    workspaceService,
    dashboardService,
    workflowService,
    repositoryService,
    userService,
    inviteService,
  } = new IrminCore(locale, usableToken);

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

  // Build the response, don't assign correct type yet, to prevent massive switch blocks later
  const workspaceProxyRes: WorkspaceProxyResponse = {
    ...emptyWorkspaceProxyResponse,
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
      dashboards: dashboardService.fetchDashboards,
      connections: workflowService.fetchConnections,
      exports: workflowService.fetchExports,
      actions: workflowService.fetchActions,
      repositories: repositoryService.fetchRepositories,
      users: userService.fetchWorkspaceUsers,
      invites: () =>
        inviteService.fetchInvitesByWorkspace(
          workspaceProxyRes.metadata.workspace
        ),
    };
    // Fetch all data and wait for all the promises to resolve
    const results = await Promise.allSettled(
      Object.values(promises).map((p) => p())
    );
    // Assign the results to the appropriate property
    results.map((res, i) => {
      // Find which function was executed by the index of the promise
      const objectKey = Object.keys(promises)[i] as keyof WorkspaceProxyData;
      // Handle the promise result
      if (res.status === 'rejected') {
        // If the promise was rejected, add the error to the errors array
        workspaceProxyRes.metadata.errors.push({
          error: res.reason,
          object: objectKey,
        });
        return;
      }
      if (res.status === 'fulfilled') {
        // If the promise was fulfilled, assign the data to the appropriate property
        const data = res.value?.data ?? [];
        workspaceProxyRes.data[objectKey] = removeCircularJSON(data);
      }
    });
  } catch (error) {
    // Log the error, but don't throw it
    console.error('GET /api/workspace error', error);
  } finally {
    // Switch back to the original workspace
    if (profile?.data?.workspace?.slug)
      workspaceService.switchWorkspace(profile.data.workspace.slug);
  }

  // Return the full workspace data as JSON
  return new Response(JSON.stringify(workspaceProxyRes), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
