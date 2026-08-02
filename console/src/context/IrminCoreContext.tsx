'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

import IrminCore from '@/lib/core';

import { useIAM } from '@/context/IAMContext';
import { useLocale } from '@/context/LocaleContext';

/**
 * Context value for IrminCore provider.
 */
interface IrminCoreContextValue {
  /**
   * Returns a cached IrminCore instance with fresh token.
   * Reuses the same instance unless locale changes, avoiding
   * repeated instantiation of 24+ service classes.
   */
  getCore: () => Promise<IrminCore>;
}

const IrminCoreContext = createContext<IrminCoreContextValue | null>(null);

/**
 * Provider that caches IrminCore instance to avoid repeated instantiation.
 *
 * IrminCore creates 24+ service classes in its constructor. Previously,
 * every API hook created a new instance on every query, causing significant
 * overhead. This provider caches a single instance and only updates the
 * token when needed.
 *
 * @param props - Provider props
 * @param props.children - Child components
 */
export const IrminCoreProvider = ({ children }: { children: ReactNode }) => {
  const { getToken } = useIAM();
  const { locale } = useLocale();

  // Cache the core instance and track locale for invalidation
  const coreRef = useRef<IrminCore | null>(null);
  const localeRef = useRef<string>(locale);

  /**
   * Returns cached IrminCore, refreshing token as needed.
   * Creates new instance only if locale changes.
   */
  const getCore = useCallback(async (): Promise<IrminCore> => {
    const token = await getToken();

    // Create new instance if none exists or locale changed
    if (coreRef.current === null || localeRef.current !== locale) {
      coreRef.current = new IrminCore(locale, token);
      localeRef.current = locale;
    } else {
      // Update token on existing instance
      coreRef.current.setToken(token);
    }

    return coreRef.current;
  }, [getToken, locale]);

  const value = useMemo<IrminCoreContextValue>(() => ({ getCore }), [getCore]);

  return (
    <IrminCoreContext.Provider value={value}>
      {children}
    </IrminCoreContext.Provider>
  );
};

/**
 * Hook to get cached IrminCore instance.
 *
 * @returns Context value with getCore function
 * @throws Error if used outside IrminCoreProvider
 *
 * @example
 * ```tsx
 * const { getCore } = useIrminCore();
 *
 * const query = useQuery({
 *   queryKey: ['repositories'],
 *   queryFn: async () => {
 *     const core = await getCore();
 *     return core.repositoryService.fetchRepositories({ workspace });
 *   },
 * });
 * ```
 */
export const useIrminCore = (): IrminCoreContextValue => {
  const ctx = useContext(IrminCoreContext);
  if (!ctx) {
    throw new Error('useIrminCore must be used within IrminCoreProvider');
  }
  return ctx;
};
