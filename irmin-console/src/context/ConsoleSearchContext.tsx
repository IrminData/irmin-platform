'use client';

import { createContext, useContext, useState } from 'react';

import { ConsoleSearchItem } from '@/types/internal/ConsoleSearch';

interface ConsoleSearchContextProps {
  searchItems: ConsoleSearchItem[];
  setSearchItems: (items: ConsoleSearchItem[]) => void;
}

const ConsoleSearchContext = createContext<
  ConsoleSearchContextProps | undefined
>(undefined);

export const ConsoleSearchProvider = ({
  children,
  initialSearchItems,
}: {
  children: React.ReactNode;
  initialSearchItems: ConsoleSearchItem[];
}) => {
  const [searchItems, setSearchItems] =
    useState<ConsoleSearchItem[]>(initialSearchItems);
  return (
    <ConsoleSearchContext.Provider
      value={{
        searchItems,
        setSearchItems,
      }}
    >
      {children}
    </ConsoleSearchContext.Provider>
  );
};

/**
 * Hook to use the connection context
 */
export const useConsoleSearchContext = (): ConsoleSearchContextProps => {
  const context = useContext(ConsoleSearchContext);
  if (!context) {
    throw new Error(
      'useConsoleSearchContext must be used within a ConsoleSearchProvider'
    );
  }
  return context;
};
