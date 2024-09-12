'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import { TreeNode } from '@/components/documentation/TreeChart';

import { useWorkspace } from '@/context/workspace';

const TreeChart = dynamic(
  () => import('@/components/documentation/TreeChart'),
  {
    loading: () => <LoadingSkeleton />,
  }
);

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
    exports: { exports, isLoading: exportsLoading },
    actions: { actions, isLoading: actionsLoading },
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

      // Create empty workflows node.
      const workflowsNode: TreeNode = {
        id: `workspace-${currentWorkspace.slug}-workflows`,
        label: 'Workflows',
        children: [],
      };

      // Add connections.
      if (connections) {
        const connectionsNode: TreeNode = {
          id: `connection-workflows`,
          label: 'Connections',
          children: connections.map((connection) => ({
            id: `workflow-connection-${connection.id}`,
            label: connection.name,
            children: connection.repository
              ? [
                  {
                    id: `repository-${connection.repository.id}`,
                    label: `Repository: ${connection.repository.name}`,
                    children: connection.repository.collections.map((item) => ({
                      id: `repository-${connection.repository?.id}-collection-${item}`,
                      label: item.split('.').slice(1, -1).join('.'), // Only show part of the collection name between first and last dots
                    })),
                  },
                ]
              : [],
          })),
        };
        workflowsNode.children?.push(connectionsNode);
      }

      // Add exports.
      if (exports) {
        const exportsNode = {
          id: 'export-workflows',
          label: 'Exports',
          children: exports.map((export_) => ({
            id: `workflow-export-${export_.id}`,
            label: export_.name,
            links: [
              `repository-${export_.workflowable?.source?.id ?? ''}`,
              `workflow-connection-${export_.workflowable?.destination?.id ?? ''}`,
            ],
          })),
        };
        workflowsNode.children?.push(exportsNode);
      }

      // Add actions.
      if (actions) {
        const actionsNode = {
          id: 'action-workflows',
          label: 'Actions',
          children: actions.map((action) => ({
            id: `workflow-action-${action.id}`,
            name: action.name,
            children: action.repository
              ? [
                  {
                    id: `repository-${action.repository.id}`,
                    label: `Repository: ${action.repository.name}`,
                    children: action.repository.collections.map((item) => ({
                      id: `repository-${action.repository?.id}-collection-${item}`,
                      label: item.split('.').slice(1, -1).join('.'), // Only show part of the collection name between first and last dots
                    })),
                  },
                ]
              : [],
          })),
        };
        workflowsNode.children?.push(actionsNode);
      }

      // Add workflows node to the tree.
      newTree.children?.push(workflowsNode);

      // Add repositories. Only add non-workflow repositories.
      if (repositories) {
        const repositoriesNode = {
          id: 'repositories',
          label: 'Repositories',
          children: repositories
            .filter((item) => !item.workflow)
            .map((repository) => ({
              id: `repository-${repository.id}`,
              label: repository.name,
              children: repository.collections.map((item) => ({
                id: `repository-${repository?.id}-collection-${item}`,
                label: item.split('.').slice(1, -1).join('.'), // Only show part of the collection name between first and last dots
              })),
            })),
        };
        newTree.children?.push(repositoriesNode);
      }

      setTree(newTree);
    }
  }, [currentWorkspace, connections, exports, actions, repositories]);

  const loading =
    workspaceLoading ||
    workspacesLoading ||
    connectionsLoading ||
    exportsLoading ||
    actionsLoading ||
    repositoriesLoading;

  return (
    <>
      {loading && <LoadingSkeleton />}
      {!loading && <TreeChart tree={tree} />}
    </>
  );
}
