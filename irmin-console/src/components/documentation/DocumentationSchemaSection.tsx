'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useWorkspaceContext } from '@/context/WorkspaceContext';

import { useConnections, useRepositories, useWorkflows } from '@/hooks/api';

import type { TreeNode } from './TreeChart';

const TreeChart = dynamic(() => import('./TreeChart'), {
  loading: () => <LoadingSkeleton />,
});

/**
 * Page UI to show the schema for the workspace as a tree chart.
 */
export default function DocumentationSchemaSection() {
  const { repositoriesQuery } = useRepositories();
  const { workflowsQuery } = useWorkflows();
  const { connectionsQuery } = useConnections();
  const { workspaceQuery } = useWorkspaceContext();
  const [tree, setTree] = useState<TreeNode>({
    id: 'workspace',
    label: 'Workspace',
    children: [],
  });

  useEffect(() => {
    if (!workspaceQuery?.data) return;
    const workflows = workflowsQuery.data?.data ?? [];
    const workspace = workspaceQuery.data.data;

    // Build the tree from the workspace's data.
    const newTree: TreeNode = {
      id: `workspace-${workspace?.slug}`,
      label: workspace?.name,
      children: [],
    };

    // Create connections node.
    const connectionsNode: TreeNode = {
      id: `workspace-${workspace?.slug}-connections`,
      label: 'Connections',
      children: [],
    };
    if (connectionsQuery.data?.data) {
      connectionsNode.children = connectionsQuery.data.data.map(
        (connection) => ({
          id: `connection-${connection.id}`,
          label: connection.name,
        })
      );
    }
    newTree.children?.push(connectionsNode);

    // Create repositories node.
    const repositoriesNode: TreeNode = {
      id: `workspace-${workspace?.slug}-repositories`,
      label: 'Repositories',
      children: [],
    };
    if (repositoriesQuery.data?.data) {
      repositoriesNode.children = repositoriesQuery.data.data.map(
        (repository) => ({
          id: `repository-${repository.slug}`,
          label: repository.name,
        })
      );
    }
    newTree.children?.push(repositoriesNode);

    // Create empty workflows node.
    const workflowsNode: TreeNode = {
      id: `workspace-${workspace?.slug}-workflows`,
      label: 'Workflows',
      children: [],
    };

    // Add import workflows.
    if (
      workflows.filter((item) => item.type === 'import').length > 0 &&
      !workflowsQuery.isLoading
    ) {
      const importsNode: TreeNode = {
        id: `import-workflows`,
        label: 'Imports',
        children: workflows
          .filter((item) => item.type === 'import')
          .map((item) => ({
            id: `workflow-import-${item.id}`,
            label: item.name,
          })),
      };
      workflowsNode.children?.push(importsNode);
    }

    // Add export workflows.
    if (
      workflows.filter((item) => item.type === 'export').length > 0 &&
      !workflowsQuery.isLoading
    ) {
      const exportsNode = {
        id: 'export-workflows',
        label: 'Exports',
        children: workflows
          .filter((item) => item.type === 'export')
          .map((item) => ({
            id: `workflow-export-${item.id}`,
            label: item.name,
          })),
      };
      workflowsNode.children?.push(exportsNode);
    }

    // Add action workflows.
    if (
      workflows.filter((item) => item.type === 'action').length > 0 &&
      !workflowsQuery.isLoading
    ) {
      const actionsNode = {
        id: 'action-workflows',
        label: 'Actions',
        children: workflows
          .filter((item) => item.type === 'action')
          .map((item) => ({
            id: `workflow-action-${item.id}`,
            name: item.name,
          })),
      };
      workflowsNode.children?.push(actionsNode);
    }

    // Add pipeline workflows.
    if (
      workflows.filter((item) => item.type === 'action').length > 0 &&
      !workflowsQuery.isLoading
    ) {
      const pipeliensNode = {
        id: 'pipeline-workflows',
        label: 'Pipelines',
        children: workflows
          .filter((item) => item.type === 'pipeline')
          .map((item) => ({
            id: `workflow-pipeline-${item.id}`,
            name: item.name,
          })),
      };
      workflowsNode.children?.push(pipeliensNode);
    }

    // Add workflows node to the tree.
    newTree.children?.push(workflowsNode);

    setTree(newTree);
  }, [
    workspaceQuery,
    connectionsQuery.data?.data,
    repositoriesQuery.data?.data,
    workflowsQuery.data?.data,
    workflowsQuery.isLoading,
  ]);

  return <TreeChart tree={tree} />;
}
