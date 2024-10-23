/**
 * Get example/Fake API response objects
 * of the Irmin Core API
 *
 * Used to simulate API responses, testing, working offline,
 * planning, development, and more
 */
import { IrminAPIResponse } from '@/types/core/IrminAPIResponse';

import { branches } from './branches';
import {
  collectionData,
  collections,
  fileCollectionData,
  folderCollectionData,
  repositorySchema,
  tableCollectionData,
} from './collections';
import { commits } from './commits';
import { connections } from './connections';
import { connectors } from './connectors';
import { content } from './content';
import { diff } from './diff';
import { editorItems } from './editorItems';
import { files } from './files';
import { folders } from './folders';
import { invites } from './invites';
import {
  connectionLogEvents,
  logEvents,
  repositoryLogEvents,
  workflowLogEvents,
  workflowRunLogs,
} from './logs';
import { clerkUser, profile } from './profile';
import { queries, queryExecutionResult } from './queries';
import { repositories } from './repositories';
import { roles } from './roles';
import { tags } from './tags';
import { workspaceUsers } from './users';
import { workflowRuns } from './workflowRuns';
import { actions, exports, imports, workflows } from './workflows';
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
};

/**
 * Get example unstructured API response from the Irmin Core API
 */
export const exampleAPIUnstructuredResponse = content;

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
 * Fake Clerk user object {@link clerkUser}
 */
export const exampleClerkUser = clerkUser;

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
 * Fake tags {@link tags}
 */
export const exampleTags = tags();

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
 * Fake folder collection data {@link folderCollectionData}
 */
export const exampleFolderCollectionData = folderCollectionData();

/**
 * Fake file collection data {@link fileCollectionData}
 */
export const exampleFileCollectionData = fileCollectionData();

/**
 * Get example collection data
 *
 * @param type - Type of collection data to return
 */
export const exampleCollectionData = collectionData;

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
