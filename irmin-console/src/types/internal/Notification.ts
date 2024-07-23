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
