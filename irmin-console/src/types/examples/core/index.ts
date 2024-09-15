/**
 * Get example/Fake API response objects
 * of the Irmin Core API
 *
 * Used to simulate API responses, testing, working offline,
 * planning, development, and more
 */
import { IrminAPIResponse } from '@/types/api/IrminAPIResponse';

import { bucket } from './bucket';
import { connections } from './connections';
import { connectors } from './connectors';
import { files } from './files';
import { folders } from './folders';
import { invites } from './invites';
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
  },
  message: 'This is example for IrminAPIResponse',
  errors: {
    everythingIsBroken: [
      'You are seeing an example response, instead of the real thing',
    ],
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
