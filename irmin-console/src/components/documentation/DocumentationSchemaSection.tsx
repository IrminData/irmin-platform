'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

import { RawNodeDatum } from 'react-d3-tree';

import LoadingSkeleton from '@/components/common/loading/LoadingSkeleton';
import PortalTitle from '@/components/portal/PortalTitle';

import { useLocale } from '@/context/LocaleContext';
import { useWorkspace } from '@/context/workspace';

const TreeChart = dynamic(() => import('./TreeChart'), {
  loading: () => <LoadingSkeleton />,
});

/**
 * Page UI to show the schema for the workspace as a tree chart.
 */
export default function DocumentationSchemaSection() {
  const { dict } = useLocale();
  const [tree, setTree] = useState<RawNodeDatum>({
    name: 'Workspace',
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
      const newTree: RawNodeDatum = {
        name: currentWorkspace.name,
        attributes: {
          type: 'Workspace',
        },
        children: [],
      };

      // Add connections.
      if (connections) {
        const connectionsNode = {
          name: 'Connections',
          children: connections.map((connection) => ({
            name: connection.name,
            attributes: {
              type: 'Connection',
            },
          })),
        };
        newTree.children?.push(connectionsNode);
      }

      // Add exports.
      if (exports) {
        const exportsNode = {
          name: 'Exports',
          children: exports.map((export_) => ({
            name: export_.name,
            attributes: {
              type: 'Export',
            },
          })),
        };
        newTree.children?.push(exportsNode);
      }

      // Add actions.
      if (actions) {
        const actionsNode = {
          name: 'Actions',
          children: actions.map((action) => ({
            name: action.name,
            attributes: {
              type: 'Action',
            },
          })),
        };
        newTree.children?.push(actionsNode);
      }

      // Add repositories.
      if (repositories) {
        const repositoriesNode = {
          name: 'Repositories',
          children: repositories.map((repository) => ({
            name: repository.name,
            attributes: {
              type: 'Repository',
            },
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
      <div className='mb-4 px-2 md:px-4'>
        <PortalTitle title={dict.documentation.schema} />
      </div>
      {loading && <LoadingSkeleton />}
      {!loading && <TreeChart tree={tree} />}
    </>
  );
}
