'use client';

import React, { useMemo } from 'react';

import { Edge, Node, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from 'next-themes';

import DatatableColumnsTable from '@/components/repository/partials/DatatableColumnsTable';

import { DatatableSchema } from '@/types/internal/Datatable';

/**
 * Generates nodes and edges for a database schema visualization.
 *
 * @param schema - The database schema to visualize.
 * @returns Object containing `nodes` and `edges` arrays for ReactFlow.
 */
const generateFlowData = (
  schema: DatatableSchema[]
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Positioning tables programmatically (in a grid pattern)
  let xPos = 0;
  let yPos = 0;

  schema.forEach((tableSchema, index) => {
    const nodeId = `table-${tableSchema.table}`;

    // Create a node for each table
    nodes.push({
      id: nodeId,
      position: { x: xPos, y: yPos },
      data: {
        label: (
          <div>
            <DatatableColumnsTable schema={tableSchema} />
          </div>
        ),
      },
    });

    // Update position for next table
    xPos += 300; // Move next table to the right
    if ((index + 1) % 3 === 0) {
      xPos = 0;
      yPos += 300; // Move next row down
    }

    // Create edges for foreign key relations
    tableSchema.columns.forEach((column) => {
      if (column.foreignKey) {
        edges.push({
          id: `fk-${tableSchema.table}-${column.name}-${column.foreignKey.referencedTable}`,
          source: nodeId,
          target: `table-${column.foreignKey.referencedTable}`,
          animated: true,
          label: `${column.name} → ${column.foreignKey.referencedColumn}`,
        });
      }
    });

    // Create edges for defined relations
    if (tableSchema.relations) {
      tableSchema.relations.forEach((relation) => {
        relation.columns.forEach((col, idx) => {
          edges.push({
            id: `rel-${tableSchema.table}-${relation.relatedTable}-${col}-${relation.relatedColumns[idx]}`,
            source: nodeId,
            target: `table-${relation.relatedTable}`,
            animated: true,
            label: `${relation.relationType}: ${col} → ${relation.relatedColumns[idx]}`,
          });
        });
      });
    }
  });

  return { nodes, edges };
};

/**
 * Component to visualise a database schema using ReactFlow.
 *
 * @param schema - The database schema to visualise.
 * @returns A React component displaying the database schema chart.
 */
export default function DatabaseSchemaChart({
  schema,
}: {
  schema: DatatableSchema[];
}) {
  const { theme } = useTheme();

  // Generate flow data (nodes and edges) from the schema
  const { nodes, edges } = useMemo(() => generateFlowData(schema), [schema]);

  return (
    <div className='h-[calc(100vh-150px)] w-full' id='db-schema-chart'>
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
