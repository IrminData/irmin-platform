'use client';

import React from 'react';

import Tree, { RawNodeDatum } from 'react-d3-tree';

/**
 * Component to visualise a tree chart using `react-d3-tree`.
 *
 * @param tree - The tree data to visualise
 */
export default function TreeChart({ tree }: { tree: RawNodeDatum }) {
  return (
    <div className='h-[70vh] w-full' id='treeWrapper'>
      <Tree
        data={tree}
        rootNodeClassName='node__root'
        branchNodeClassName='node__branch'
        leafNodeClassName='node__leaf'
        onNodeClick={(node) => {
          console.log('node clicked: ', node);
        }}
        pathFunc={'elbow'}
        collapsible={false}
        orientation='horizontal'
      />
    </div>
  );
}
