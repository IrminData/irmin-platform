/**
 * Get example/Fake API response objects
 * of the Irmin Core API
 *
 * Used to simulate API responses, testing, working offline,
 * planning, development, and more
 */
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { branches } from './branches';
import { bucket } from './bucket';
import {
  collections,
  fileCollectionData,
  folderCollectionData,
  repositorySchema,
  streamCollectionData,
  tableCollectionData,
} from './collections';
import { commits } from './commits';
import { connections } from './connections';
import { connectors } from './connectors';
import { files } from './files';
import { folders } from './folders';
import { invites } from './invites';
import { logEvents, workflowRunLogs } from './logs';
import { profile } from './profile';
import { repositories } from './repositories';
import { roles } from './roles';
import { workspaceUsers } from './users';
import { workflowRuns } from './workflowRuns';
import { actions, exports, imports, workflows } from './workflows';
import { workspaces } from './workspaces';

/**
 * Get example API response base from the Irmin Core API
 *
 *
 * Type: {@link IrminAPIResponse}
 */
export const exampleAPIResponse: IrminAPIResponse = {
  metadata: {
    allGood: 'yes',
    itemsReturned: '12',
    timeTaken: '1234',
    logs: `
      This is an example response from the API.
      You are seeing this because the API is not available.
      This is a fake response, not the real thing.
      You might also be in offline mode.
    `,
  },
  message: 'This is example for IrminAPIResponse',
  errors: {
    everythingIsBroken: [
      'You are seeing an example response, instead of the real thing',
      'This is because the API is not available',
    ],
    offlineMode: ['You might also be in offline mode'],
  },
};

/**
 * Fake {@link roles}
 */
export const exampleRoles = roles();

/**
 * Fake workspaces {@link workspaces}
 */
export const exampleWorkspaces = workspaces();

/**
 * Fake profile {@link profile}
 */
export const exampleProfile = profile();

/**
 * Fake invites {@link invites}
 */
export const exampleInvites = invites();

/**
 * Fake workspace users {@link workspaceUsers}
 */
export const exampleWorkspaceUsers = workspaceUsers();

/**
 * Fake connectors {@link connectors}
 */
export const exampleConnectors = connectors();

/**
 * Fake repositories {@link repositories}
 */
export const exampleRepositories = repositories();

/**
 * Fake branches {@link branches}
 */
export const exampleBranches = branches();

/**
 * Fake commits {@link commits}
 */
export const exampleCommits = commits();

/**
 * Fake collections {@link collections}
 */
export const exampleCollections = collections();

/**
 * Fake repository schema {@link repositorySchema}
 */
export const exampleRepositorySchema = repositorySchema();

/**
 * Fake table collection data {@link tableCollectionData}
 */
export const exampleTableCollectionData = tableCollectionData();

/**
 * Fake stream collection data {@link streamCollectionData}
 */
export const exampleStreamCollectionData = streamCollectionData();

/**
 * Fake folder collection data {@link folderCollectionData}
 */
export const exampleFolderCollectionData = folderCollectionData();

/**
 * Fake file collection data {@link fileCollectionData}
 */
export const exampleFileCollectionData = fileCollectionData();

/**
 * Fake connections {@link connections}
 */
export const exampleConnections = connections();

/**
 * Fake workflows {@link workflows}
 */
export const exampleWorkflows = workflows();

/**
 * Fake action workflows {@link actions}
 */
export const exampleActions = actions();

/**
 * Fake import workflows {@link imports}
 */
export const exampleImports = imports();

/**
 * Fake export workflows {@link exports}
 */
export const exampleExports = exports();

/**
 * Fake workflow runs {@link workflowRuns}
 */
export const exampleWorkflowRuns = workflowRuns();

/**
 * Fake folders {@link folders}
 */
export const exampleFolders = folders();

/**
 * Fake files {@link files}
 */
export const exampleFiles = files();

/**
 * Fake bucket {@link bucket}
 */
export const exampleBucket = bucket();

/**
 * Fake log events {@link logEvents}
 */
export const exampleLogEvents = logEvents();

/**
 * Fake workflow run logs {@link workflowRunLogs}
 */
export const exampleWorkflowRunLogs = workflowRunLogs();
