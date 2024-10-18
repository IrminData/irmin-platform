'use client';

import React, { useMemo } from 'react';

import { Controls, Edge, Node, ReactFlow } from '@xyflow/react';
import { useTheme } from 'next-themes';

import '@xyflow/react/dist/style.css';

/**
 * Interface representing a tree node.
 */
export interface TreeNode {
  id: string;
  label?: string;
  children?: TreeNode[];
  links?: string[]; // Array of node IDs this node links to
}

/**
 * Generates flow data (nodes and edges) from a tree structure.
 *
 * @param tree - The root node of the tree.
 * @returns An object containing arrays of `nodes` and `edges` for ReactFlow.
 */
const generateFlowData = (tree: TreeNode): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const nodeMap = new Map<string, TreeNode>(); // To keep track of nodes by ID

  /**
   * Recursively traverse the tree to build nodes and edges.
   *
   * @param node - The current tree node.
   * @param parentId - The id of the parent node.
   * @param level - The current depth level of the tree (for positioning).
   */
  const traverseTree = (
    node: TreeNode,
    parentId: string | null = null,
    level: number = 0
  ) => {
    const nodeId = `${node.id}`;
    nodeMap.set(nodeId, node);

    // Create the node
    nodes.push({
      id: nodeId,
      position: { x: level * 150, y: nodes.length * 100 },
      data: { label: node.label || `Node ${node.id}` },
    });

    // Create the edge from parent to this node
    if (parentId) {
      edges.push({
        id: `e${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        animated: true,
      });
    }

    // Traverse children nodes
    if (node.children) {
      node.children.forEach((child) => traverseTree(child, nodeId, level + 1));
    }
  };

  // First pass to build the nodes and the base edges
  traverseTree(tree);

  // Second pass to build the links (edges between non-hierarchical nodes)
  nodeMap.forEach((node, nodeId) => {
    if (node.links) {
      node.links.forEach((targetId) => {
        if (nodeMap.has(targetId)) {
          edges.push({
            id: `link-${nodeId}-${targetId}`,
            source: nodeId,
            target: targetId,
            animated: true,
          });
        }
      });
    }
  });

  return { nodes, edges };
};

/**
 * Component to visualise a tree chart using `ReactFlow`.
 *
 * @param props - The component props.
 * @param props.tree - The tree data to visualise.
 * @param props.className - Optional class name for the container.
 *
 * @returns A React component displaying the tree chart.
 */
export default function TreeChart({
  tree,
  className,
}: {
  tree: TreeNode;
  className?: string;
}) {
  const { theme } = useTheme();

  // Generate flow data from the tree data structure
  const { nodes, edges } = useMemo(() => generateFlowData(tree), [tree]);

  return (
    <div
      className={className ?? 'h-[calc(100vh-120px)] w-full'}
      id='tree-chart'
    >
      <ReactFlow
        defaultNodes={nodes}
        defaultEdges={edges}
        fitView
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Controls />
      </ReactFlow>
    </div>
  );
}
