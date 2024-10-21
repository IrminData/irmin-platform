'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/ui/loading/LoadingSkeleton';

import { useWorkspace } from '@/context/WorkspaceContext';

import { Connection } from '@/types/core/Connection';
import { Repository } from '@/types/core/Repository';
import {
  ActionWorkflow,
  ExportWorkflow,
  ImportWorkflow,
} from '@/types/core/Workflow';

import { TreeNode } from './TreeChart';

const TreeChart = dynamic(() => import('./TreeChart'), {
  loading: () => <LoadingSkeleton />,
});

/**
 * Page UI to show the schema for the workspace as a tree chart.
 */
export default function DocumentationSchemaSection({
  connections,
  imports,
  exports,
  actions,
  repositories,
}: {
  connections: Connection[];
  imports: ImportWorkflow[];
  exports: ExportWorkflow[];
  actions: ActionWorkflow[];
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
  }, [workspace, connections, imports, exports, actions, repositories]);

  return <TreeChart tree={tree} />;
}
