'use client';

import { createContext, useContext } from 'react';

import type { AIApplication } from '@/types/core/AIApplication';

/**
 * AI Application context props
 */
interface AIApplicationContextProps {
  /** The active AI Application */
  aiApplication: AIApplication;
}

const AIApplicationContext = createContext<
  AIApplicationContextProps | undefined
>(undefined);

/**
 * AI Application context provider for state management and interactions with AI Applications
 *
 * @param props - Provider configuration
 * @param props.children - Child components
 * @param props.aiApplication - AI Application object
 *
 * @returns AI Application context provider
 */
export const AIApplicationProvider = ({
  children,
  aiApplication,
}: {
  children: React.ReactNode;
  aiApplication: AIApplication;
}) => {
  return (
    <AIApplicationContext.Provider
      value={{
        aiApplication,
      }}
    >
      {children}
    </AIApplicationContext.Provider>
  );
};

/**
 * Hook to use the AI Application context
 */
export const useAIApplicationContext = (): AIApplicationContextProps => {
  const context = useContext(AIApplicationContext);
  if (!context) {
    throw new Error(
      'useAIApplicationContext must be used within an AIApplicationProvider'
    );
  }
  return context;
};
