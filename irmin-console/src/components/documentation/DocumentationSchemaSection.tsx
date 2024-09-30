'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';

import { useWorkspace } from '@/context/workspace';

import { TreeNode } from './TreeChart';

const TreeChart = dynamic(() => import('./TreeChart'), {
  loading: () => <LoadingSkeleton />,
});

/**
 * Page UI to show the schema for the workspace as a tree chart.
 */
export default function DocumentationSchemaSection() {
  const [tree, setTree] = useState<TreeNode>({
    id: 'workspace',
    label: 'Workspace',
    children: [],
  });

  const {
    workspaceLoading,
    workspaces: { currentWorkspace, workspacesLoading },
    connections: { connections, isLoading: connectionsLoading },
    workflows: {
      imports: { imports, isLoading: importsLoading },
      exports: { exports, isLoading: exportsLoading },
      actions: { actions, isLoading: actionsLoading },
    },
    repositories: { repositories, isLoading: repositoriesLoading },
  } = useWorkspace();

  useEffect(() => {
    // Build the tree from the workspace's data.
    if (currentWorkspace) {
      const newTree: TreeNode = {
        id: `workspace-${currentWorkspace.slug}`,
        label: currentWorkspace.name,
        children: [],
      };

      // Create connections node.
      const connectionsNode: TreeNode = {
        id: `workspace-${currentWorkspace.slug}-connections`,
        label: 'Connections',
        children: [],
      };
      if (connections) {
        connectionsNode.children = connections.map((connection) => ({
          id: `connection-${connection.id}`,
          label: connection.name,
        }));
      }
      newTree.children?.push(connectionsNode);

      // Create repositories node.
      const repositoriesNode: TreeNode = {
        id: `workspace-${currentWorkspace.slug}-repositories`,
        label: 'Repositories',
        children: [],
      };
      if (repositories) {
        repositoriesNode.children = repositories.map((repository) => ({
          id: `repository-${repository.slug}`,
          label: repository.name,
        }));
      }
      newTree.children?.push(repositoriesNode);

      // Create empty workflows node.
      const workflowsNode: TreeNode = {
        id: `workspace-${currentWorkspace.slug}-workflows`,
        label: 'Workflows',
        children: [],
      };

      // Add import workflows.
      if (imports) {
        const importsNode: TreeNode = {
          id: `import-workflows`,
          label: 'Imports',
          children: imports.map((importSync) => ({
            id: `workflow-import-${importSync.id}`,
            label: importSync.name,
          })),
        };
        workflowsNode.children?.push(importsNode);
      }

      // Add export workflows.
      if (exports) {
        const exportsNode = {
          id: 'export-workflows',
          label: 'Exports',
          children: exports.map((exportSync) => ({
            id: `workflow-export-${exportSync.id}`,
            label: exportSync.name,
          })),
        };
        workflowsNode.children?.push(exportsNode);
      }

      // Add action workflows.
      if (actions) {
        const actionsNode = {
          id: 'action-workflows',
          label: 'Actions',
          children: actions.map((action) => ({
            id: `workflow-action-${action.id}`,
            name: action.name,
          })),
        };
        workflowsNode.children?.push(actionsNode);
      }

      // Add workflows node to the tree.
      newTree.children?.push(workflowsNode);

      setTree(newTree);
    }
  }, [currentWorkspace, connections, imports, exports, actions, repositories]);

  const loading =
    workspaceLoading ||
    workspacesLoading ||
    importsLoading ||
    exportsLoading ||
    actionsLoading ||
    connectionsLoading ||
    repositoriesLoading;

  return (
    <>
      {loading && <LoadingSkeleton />}
      {!loading && <TreeChart tree={tree} />}
    </>
  );
}
