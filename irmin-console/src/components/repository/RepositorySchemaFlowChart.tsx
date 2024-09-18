'use client';

import React, { useMemo } from 'react';

import { Edge, Node, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from 'next-themes';

import { RepositorySchema } from '@/types/api/Collection';
import { TableSchema } from '@/types/internal/TableCollection';

import TableColumns from './TableColumns';

/**
 * Generates nodes and edges for a repository schema visualization.
 *
 * @param repository - The repository schema to visualize.
 * @returns Object containing `nodes` and `edges` arrays for ReactFlow.
 */
const generateFlowData = (
  repository: RepositorySchema
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Positioning tables programmatically (in a grid pattern)
  let xPos = 0;
  let yPos = 0;

  repository.forEach((collection, index) => {
    const nodeId = `${collection.type}-${collection.formatted_name}`;

    if (collection.type === 'table') {
      // Create a node for the table
      nodes.push({
        id: nodeId,
        position: { x: xPos, y: yPos },
        data: {
          label: (
            <div>
              <TableColumns
                name={collection.name}
                schema={collection.schema as TableSchema}
              />
            </div>
          ),
        },
      });
    }

    // Update position for next table
    xPos += 300; // Move next table to the right
    if ((index + 1) % 3 === 0) {
      xPos = 0;
      yPos += 300; // Move next row down
    }
  });

  return { nodes, edges };
};

/**
 * Component to visualise schema of a repository using ReactFlow.
 *
 * @param schema - The repository schema to visualise.
 * @returns A React component displaying the repository schema chart.
 */
export default function RepositorySchemaFlowChart({
  schema,
}: {
  schema: RepositorySchema;
}) {
  const { theme } = useTheme();

  // Generate flow data (nodes and edges) from the schema
  const { nodes, edges } = useMemo(() => generateFlowData(schema), [schema]);

  return (
    <div className='h-[calc(100vh-230px)] w-full' id='repository-schema-chart'>
      <ReactFlow
        defaultNodes={nodes}
        defaultEdges={edges}
        fitView
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        nodesDraggable={true}
        nodesConnectable={false}
      />
    </div>
  );
}
