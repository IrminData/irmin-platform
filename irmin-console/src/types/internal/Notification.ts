/**
 * Notification type
 * TODO: Needs to be removed and implemented in the API types
 * @typeParam id - Notification ID
 * @typeParam title - Notification title
 * @typeParam message - Notification message
 * @typeParam path - Path to the related object
 * @typeParam relatedWorkspaceSlug - Slug of the related workspace
 * @typeParam relatedWorkspaceName - Name of the related workspace
 * @typeParam timestamp - Timestamp of the notification
 * @typeParam type - Notification type
 */
export interface Notification {
  id: number;
  title: string;
  message: string;
  path: string; // If relatedWorkspace is null the path should be absolute, otherwise it should be within the workspace
  relatedWorkspaceSlug?: string | null; // If null, the notification is workspace-independent
  relatedWorkspaceName?: string | null;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
}
