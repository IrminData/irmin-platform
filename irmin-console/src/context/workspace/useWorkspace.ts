'use client';

import { useContext } from 'react';

import WorkspaceContext from './WorkspaceContext';

export const useWorkspace = () => useContext(WorkspaceContext);
