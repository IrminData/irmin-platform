'use client';

import { useCallback, useEffect, useMemo } from 'react';

import type { Edge, Node, NodeTypes } from '@xyflow/react';
import {
  addEdge,
  Background,
  Connection,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTheme } from 'next-themes';

import { BsGear } from 'react-icons/bs';
import {
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlineDatabase,
  HiOutlineDocumentText,
  HiOutlineFolder,
  HiOutlinePlay,
} from 'react-icons/hi';

/**
 * Interface representing a tree node.
 */
export interface TreeNode {
  id: string;
  label?: string;
  children?: TreeNode[];
  links?: string[]; // Array of node IDs this node links to
  type?:
    | 'workspace'
    | 'repository'
    | 'connection'
    | 'workflow'
    | 'schema'
    | 'folder';
  metadata?: Record<string, unknown>;
}

/**
 * Interface for custom node data.
 */
interface CustomNodeData {
  label: string;
  type:
    | 'workspace'
    | 'repository'
    | 'connection'
    | 'workflow'
    | 'schema'
    | 'folder';
  count?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Custom node component for different types
const CustomNode = ({ data }: { data: CustomNodeData }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'workspace':
        return <HiOutlineDocumentText className='size-4' />;
      case 'repository':
        return <HiOutlineCollection className='size-4' />;
      case 'connection':
        return <HiOutlineCog className='size-4' />;
      case 'workflow':
        return <HiOutlinePlay className='size-4' />;
      case 'schema':
        return <HiOutlineDatabase className='size-4' />;
      case 'folder':
        return <HiOutlineFolder className='size-4' />;
      default:
        return <BsGear className='size-4' />;
    }
  };

  const getNodeStyles = () => {
    switch (data.type) {
      case 'workspace':
        return 'bg-gradient-to-r from-primary/20 to-primary/10 border-primary/50 text-primary-foreground';
      case 'repository':
        return 'bg-gradient-to-r from-blue-500/20 to-blue-400/10 border-blue-500/50 text-blue-900 dark:text-blue-100';
      case 'connection':
        return 'bg-gradient-to-r from-green-500/20 to-green-400/10 border-green-500/50 text-green-900 dark:text-green-100';
      case 'workflow':
        return 'bg-gradient-to-r from-purple-500/20 to-purple-400/10 border-purple-500/50 text-purple-900 dark:text-purple-100';
      case 'schema':
        return 'bg-gradient-to-r from-orange-500/20 to-orange-400/10 border-orange-500/50 text-orange-900 dark:text-orange-100';
      case 'folder':
        return 'bg-gradient-to-r from-gray-500/20 to-gray-400/10 border-gray-500/50 text-gray-900 dark:text-gray-100';
      default:
        return 'bg-card border-border text-foreground';
    }
  };

  return (
    <div
      className={`
        max-w-[300px] min-w-[200px] cursor-pointer rounded-lg border-2 px-4 py-2
        shadow-lg backdrop-blur-sm transition-all duration-200
        hover:shadow-xl
        ${getNodeStyles()}
      `}
    >
      <div className='mb-1 flex items-center gap-2'>
        {getIcon()}
        <div className='truncate text-sm font-medium'>{data.label}</div>
      </div>
      {data.description && (
        <div className='truncate text-xs opacity-75'>{data.description}</div>
      )}
      {data.count && (
        <div className='mt-1 text-xs opacity-75'>{data.count} items</div>
      )}
    </div>
  );
};

// Node types for ReactFlow
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

/**
 * Generates flow data (nodes and edges) from a tree structure.
 */
const generateFlowData = (tree: TreeNode): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // Configuration for layout
  const LEVEL_SPACING = 350;
  const NODE_SPACING = 120;
  const levelCounts = new Map<number, number>();

  /**
   * Get node type and extract metadata from label
   */
  const getNodeType = (
    node: TreeNode,
    level: number
  ): { type: string; count?: number; description?: string } => {
    if (level === 0) return { type: 'workspace' };

    const label = node.label || '';

    if (label.includes('📁') || label.includes('Repositories')) {
      const match = label.match(/\((\d+)\)/);
      return {
        type: 'repository',
        count: match ? parseInt(match[1]) : undefined,
      };
    }
    if (label.includes('🔗') || label.includes('Connections')) {
      const match = label.match(/\((\d+)\)/);
      return {
        type: 'connection',
        count: match ? parseInt(match[1]) : undefined,
      };
    }
    if (
      label.includes('⚡') ||
      label.includes('Workflows') ||
      label.includes('📥') ||
      label.includes('📤') ||
      label.includes('🎯') ||
      label.includes('🔄')
    ) {
      const match = label.match(/\((\d+)\)/);
      return {
        type: 'workflow',
        count: match ? parseInt(match[1]) : undefined,
      };
    }
    if (label.includes('🏗️') || label.includes('Schema')) {
      return { type: 'schema' };
    }

    return { type: 'folder' };
  };

  /**
   * Recursively traverse the tree to build nodes and edges.
   */
  const traverseTree = (
    node: TreeNode,
    parentId: string | null = null,
    level = 0
  ) => {
    const nodeId = node.id;
    nodeMap.set(nodeId, node);

    // Count nodes at this level for positioning
    const currentLevelCount = levelCounts.get(level) || 0;
    levelCounts.set(level, currentLevelCount + 1);

    const nodeInfo = getNodeType(node, level);

    // Calculate position
    const x = level * LEVEL_SPACING;
    const y = currentLevelCount * NODE_SPACING + level * 50; // Add some offset per level

    // Create the node
    nodes.push({
      id: nodeId,
      type: 'custom',
      position: { x, y },
      data: {
        label:
          node.label
            ?.replace(/📁|🔗|⚡|📥|📤|🎯|🔄|🏗️|🗂️|🌿|⚙️|⏰/gu, '')
            .trim() || `Node ${node.id}`,
        type: nodeInfo.type,
        count: nodeInfo.count,
        description: nodeInfo.description,
        metadata: node.metadata,
      },
    });

    // Create the edge from parent to this node
    if (parentId) {
      edges.push({
        id: `e${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'smoothstep',
        animated: nodeInfo.type === 'workflow',
        style: {
          stroke:
            nodeInfo.type === 'workflow'
              ? '#8b5cf6'
              : nodeInfo.type === 'repository'
                ? '#3b82f6'
                : nodeInfo.type === 'connection'
                  ? '#10b981'
                  : '#6b7280',
          strokeWidth: 2,
        },
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
            type: 'straight',
            animated: true,
            style: {
              stroke: '#f59e0b',
              strokeWidth: 3,
              strokeDasharray: '5,5',
            },
            label: 'Connected',
            labelStyle: { fontSize: 12, fontWeight: 600 },
          });
        }
      });
    }
  });

  return { nodes, edges };
};

/**
 * Enhanced TreeChart component with better visualization
 */
export default function TreeChart({
  tree,
  className,
}: {
  tree: TreeNode;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();

  // Generate flow data from the tree data structure
  const initialData = useMemo(() => generateFlowData(tree), [tree]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Update nodes and edges when tree changes
  useEffect(() => {
    const newData = generateFlowData(tree);
    setNodes(newData.nodes);
    setEdges(newData.edges);
  }, [tree, setNodes, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // TODO: Implement node onclick logic here
    // eslint-disable-next-line no-console
    console.log('Node clicked:', node, event);
  }, []);

  return (
    <div
      className={className ?? 'h-[calc(100vh-120px)] w-full'}
      id='tree-chart'
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        className='bg-background'
      >
        <Background
          color={resolvedTheme === 'dark' ? '#374151' : '#e5e7eb'}
          gap={20}
          size={1}
        />
        <Controls className='rounded-lg border border-border bg-card shadow-lg' />
        <MiniMap
          className='rounded-lg border border-border bg-card shadow-lg'
          nodeColor={(node) => {
            switch (node.data.type) {
              case 'workspace':
                return '#8b5cf6';
              case 'repository':
                return '#3b82f6';
              case 'connection':
                return '#10b981';
              case 'workflow':
                return '#8b5cf6';
              case 'schema':
                return '#f59e0b';
              default:
                return '#6b7280';
            }
          }}
        />
        <Panel
          position='top-right'
          className='rounded-lg border border-border bg-card p-4 shadow-lg'
        >
          <div className='mb-2 text-sm font-medium text-foreground'>Legend</div>
          <div className='space-y-2 text-xs'>
            <div className='flex items-center gap-2'>
              <div
                className={`
                  size-3 rounded border border-primary/50 bg-gradient-to-r
                  from-primary/20 to-primary/10
                `}
              />
              <span className='text-muted-foreground'>Workspace</span>
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`
                  size-3 rounded border border-blue-500/50 bg-gradient-to-r
                  from-blue-500/20 to-blue-400/10
                `}
              />
              <span className='text-muted-foreground'>Repository</span>
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`
                  size-3 rounded border border-green-500/50 bg-gradient-to-r
                  from-green-500/20 to-green-400/10
                `}
              />
              <span className='text-muted-foreground'>Connection</span>
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`
                  size-3 rounded border border-purple-500/50 bg-gradient-to-r
                  from-purple-500/20 to-purple-400/10
                `}
              />
              <span className='text-muted-foreground'>Workflow</span>
            </div>
            <div className='flex items-center gap-2'>
              <div
                className={`
                  size-3 rounded border border-orange-500/50 bg-gradient-to-r
                  from-orange-500/20 to-orange-400/10
                `}
              />
              <span className='text-muted-foreground'>Schema</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
