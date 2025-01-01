/**
 * Get example/Fake API response objects
 * of the Irmin Core API
 *
 * Used to simulate API responses, testing, working offline,
 * planning, development, and more
 */
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { branches } from './branches';
import { commits } from './commits';
import { connections } from './connections';
import {
  connectorConfigurationValidationResult,
  connectors,
} from './connectors';
import { content } from './content';
import { diff } from './diff';
import { editorItems } from './editorItems';
import { files } from './files';
import { folders } from './folders';
import { invites, inviteSignedURLPayload } from './invites';
import {
  connectionLogEvents,
  logEvents,
  repositoryLogEvents,
  workflowLogEvents,
  workflowRunLogs,
} from './logs';
import { objects } from './objects';
import { objectSchema, tableObjectSchema } from './objectSchema';
import { profile } from './profile';
import { queries, queryExecutionResult } from './queries';
import { repositories } from './repositories';
import { roles } from './roles';
import { systemTokens } from './systemToken';
import { tags } from './tags';
import { workspaceUsers } from './users';
import { workflowRuns } from './workflowRuns';
import { actions, exports, imports, pipelines, workflows } from './workflows';
import { workspaces } from './workspaces';

/**
 * Get example API response base from the Irmin Core API
 * {@link IrminAPIResponse}
 */
export const exampleAPIResponse: IrminAPIResponse = {
  metadata: {
    status: 'This is example metadata for IrminAPIResponse',
    total: 15,
    per_page: 10,
    current_page: 1,
    last_page: 2,
    first_page_url: 'https://example.com/api/v1/data?page=1',
    last_page_url: 'https://example.com/api/v1/data?page=2',
    next_page_url: 'https://example.com/api/v1/data?page=2',
    prev_page_url: null,
  },
  message: 'This is example for IrminAPIResponse',
  errors: [
    'You are seeing an example response, instead of the real thing',
    'This is because the API is not available',
    'Or you are working offline',
  ],
  data: undefined,
};

/**
 * Get example binary API response from the Irmin Core API
 */
export const exampleAPIBinaryResponse = content;

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
 * Fake system tokens {@link systemTokens}
 */
export const exampleSystemTokens = systemTokens();

/**
 * Fake invites {@link invites}
 */
export const exampleInvites = invites();

/**
 * Fake invite signed URL payload {@link inviteSignedURLPayload}
 */
export const exampleInviteSignedURLPayload = inviteSignedURLPayload;

/**
 * Fake workspace users {@link workspaceUsers}
 */
export const exampleWorkspaceUsers = workspaceUsers();

/**
 * Fake connectors {@link connectors}
 */
export const exampleConnectors = connectors();

/**
 * Fake connector configuration validation result {@link connectorConfigurationValidationResult}
 */
export const exampleConnectorConfigurationValidationResult = {
  ...connectorConfigurationValidationResult,
};

/**
 * Fake repositories {@link repositories}
 */
export const exampleRepositories = repositories();

/**
 * Fake branches {@link branches}
 */
export const exampleBranches = branches();

/**
 * Fake tags {@link tags}
 */
export const exampleTags = tags();

/**
 * Fake commits {@link commits}
 */
export const exampleCommits = commits();

/**
 * Fake objects {@link objects}
 */
export const exampleObjects = objects();

/**
 * Fake object schema {@link objectSchema}
 */
export const exampleObjectSchema = objectSchema();

/**
 * Fake table object schema {@link objectSchema}
 */
export const exampleTableObjectSchema = tableObjectSchema();

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
 * Fake pipelines {@link pipelines}
 */
export const examplePipelines = pipelines();

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
 * Fake editor items {@link editorItems}
 */
export const exampleEditorItems = editorItems();

/**
 * Fake log events {@link logEvents}
 */
export const exampleLogEvents = logEvents();

/**
 * Fake workflow log events {@link logEvents}
 */
export const exampleWorkflowLogEvents = workflowLogEvents();

/**
 * Fake repository log events {@link logEvents}
 */
export const exampleRepositoryLogEvents = repositoryLogEvents();

/**
 * Fake connection log events {@link logEvents}
 */
export const exampleConnectionLogEvents = connectionLogEvents();

/**
 * Fake workflow run logs {@link workflowRunLogs}
 */
export const exampleWorkflowRunLogs = workflowRunLogs();

/**
 * Fake diff {@link diff}
 */
export const exampleDiff = diff();

/**
 * Fake queries {@link queries}
 */
export const exampleQueries = queries();

/**
 * Fake example query execution result {@link queryExecutionResult}
 */
export const exampleQueryExecutionResult = queryExecutionResult;
