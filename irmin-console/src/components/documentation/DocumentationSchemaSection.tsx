'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useWorkspace } from '@/context/WorkspaceContext';

import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import { Workflow } from '@/types/core/Workflow';

import { TreeNode } from './TreeChart';

const TreeChart = dynamic(() => import('./TreeChart'), {
  loading: () => <LoadingSkeleton />,
});

/**
 * Page UI to show the schema for the workspace as a tree chart.
 */
export default function DocumentationSchemaSection({
  connections,
  workflows,
  repositories,
}: {
  connections: Connection[];
  workflows: Workflow[];
  repositories: Repository[];
}) {
  const { workspace } = useWorkspace();
  const [tree, setTree] = useState<TreeNode>({
    id: 'workspace',
    label: 'Workspace',
    children: [],
  });

  useEffect(() => {
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
    if (connections) {
      connectionsNode.children = connections.map((connection) => ({
        id: `connection-${connection.id}`,
        label: connection.name,
      }));
    }
    newTree.children?.push(connectionsNode);

    // Create repositories node.
    const repositoriesNode: TreeNode = {
      id: `workspace-${workspace?.slug}-repositories`,
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
      id: `workspace-${workspace?.slug}-workflows`,
      label: 'Workflows',
      children: [],
    };

    // Add import workflows.
    if (workflows.filter((item) => item.type === 'import').length > 0) {
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
    if (workflows.filter((item) => item.type === 'export').length > 0) {
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
    if (workflows.filter((item) => item.type === 'action').length > 0) {
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
    if (workflows.filter((item) => item.type === 'action').length > 0) {
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
  }, [workspace, connections, workflows, repositories]);

  return <TreeChart tree={tree} />;
}
