'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import { TreeNode } from '@/components/documentation/TreeChart';

import { useWorkspace } from '@/context/workspace';

import {
  ActionWorkflow,
  ConnectionWorkflow,
  ExportWorkflow,
  Workflow,
} from '@/types/api/Workflow';

const TreeChart = dynamic(
  () => import('@/components/documentation/TreeChart'),
  {
    loading: () => <LoadingSkeleton />,
  }
);

/**
 * Workflow Structure section component
 *
 * @param props0 - The props
 * @param props0.workflow - The workflow to editor the documentation for
 *
 * @todo Implement this component
 */
const WorkflowStructureSection = ({ workflow }: { workflow: Workflow }) => {
  const [tree, setTree] = useState<TreeNode>({
    id: 'workflow',
    label: 'Workflow',
    children: [],
  });

  const {
    workspaceLoading,
    connections: { connections, isLoading: connectionsLoading },
    exports: { exports, isLoading: exportsLoading },
    actions: { actions, isLoading: actionsLoading },
    repositories: { repositories, isLoading: repositoriesLoading },
  } = useWorkspace();

  useEffect(() => {
    let newTree: TreeNode = {
      id: `workflow-${workflow.slug}`,
      label: `Workflow: ${workflow.name}`,
      children: [],
    };
    // Handle non export workflows
    if (workflow.workflowable_type !== 'export') {
      // Find the resulting repository of this workflow
      const repository = repositories.find(
        (repository) => repository.id === workflow.repository?.id
      );
      if (repository) {
        newTree.children?.push({
          id: `repository-${repository.slug}`,
          label: `Repository: ${repository.name}`,
          children: repository.collections.map((collection) => ({
            id: `collection-${repository.slug}-${collection}`,
            label: collection,
          })),
        });
      }
      // Find all repositories referencing this workflow in their collections
      const referencingRepositories = repositories.filter(
        (repo) =>
          repo.collections.find((collection) =>
            collection.startsWith(`${workflow.slug}.`)
          ) && repo.slug !== repository?.slug
      );
      const referencingReposTree: TreeNode = {
        id: 'referencing-repositories',
        label: 'Referencing repositories',
        children: [],
      };
      referencingRepositories.forEach((repo) => {
        const collections = repo.collections.filter((collection) =>
          collection.startsWith(`${workflow.slug}.`)
        );
        referencingReposTree.children?.push({
          id: `ref-repository-${repo.slug}`,
          label: `Repository: ${repo.name}`,
          children: collections.map((collection) => ({
            id: `ref-collection-${repo.slug}-${collection}`,
            label: collection,
          })),
        });
      });
      if (
        referencingReposTree.children &&
        referencingReposTree.children.length > 0
      ) {
        newTree.children?.push(referencingReposTree);
      }
    }
    // Handle export workflows
    if (workflow.workflowable_type === 'export') {
      const exportWorkflow = workflow as ExportWorkflow;
      // Find the destination connection of this export
      const exportDestination = connections.find(
        (connection) =>
          connection.id === exportWorkflow.workflowable.destination.id
      );
      if (exportDestination) {
        newTree.children?.push({
          id: exportDestination.slug,
          label: `Destination connection: ${exportDestination.name}`,
          children: [],
        });
      }
      // Find the source repository of this export
      const exportSource = repositories.find(
        (repository) => repository.id === exportWorkflow.workflowable.source.id
      );
      if (exportSource) {
        newTree = {
          id: exportSource.slug,
          label: `Source repository: ${exportSource.name}`,
          children: [newTree],
        };
      }
    }
    // Handle connection workflows
    if (workflow.workflowable_type === 'connection') {
      const connectionWorkflow = workflow as ConnectionWorkflow;
      newTree = {
        id: `connector`,
        label: `Connector: ${connectionWorkflow.workflowable.connector.name}`,
        children: [newTree],
      };
    }
    // Handle action workflows
    if (workflow.workflowable_type === 'action') {
      const actionWorkflow = workflow as ActionWorkflow;
      newTree = {
        id: `action-file`,
        label: `Executable: ${actionWorkflow.workflowable.path}`,
        children: [newTree],
      };
    }
    // Update the tree
    setTree(newTree);
  }, [workflow, repositories, connections, exports, actions]);

  const loading =
    workspaceLoading ||
    connectionsLoading ||
    exportsLoading ||
    actionsLoading ||
    repositoriesLoading;

  return (
    <>
      {loading && <LoadingSkeleton />}
      {!loading && (
        <TreeChart tree={tree} className='h-[calc(100vh-230px)] w-full' />
      )}
    </>
  );
};

export default WorkflowStructureSection;
