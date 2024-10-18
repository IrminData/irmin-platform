'use client';

import { createContext, useContext, useMemo } from 'react';

import { defaultLocale, Locale } from '@/dictionaries';
import IrminCore from '@/services/core/IrminCore';

import { useIAM } from '@/context/IAMContext';

const IrminCoreContext = createContext<{
  irminCore: IrminCore;
}>({
  irminCore: new IrminCore(defaultLocale, ''),
});

/**
 * Irmin Core API provider
 *
 * Provider for the API interaction logic on the client side.
 *
 * @param params
 * @param params.children - The child components
 * @param params.locale - The locale
 * @param params.token - (optional) The API token of the authenticated user from Clerk
 */
export const IrminCoreProvider = ({
  children,
  locale,
  token,
}: {
  children: React.ReactNode;
  locale: Locale;
  token?: string;
}) => {
  const { token: iamToken } = useIAM();
  const theToken = useMemo(() => token ?? iamToken ?? '', [token, iamToken]);
  const irminCore = useMemo(
    () => new IrminCore(locale, theToken),
    [locale, theToken]
  );
  return (
    <IrminCoreContext.Provider
      value={{
        irminCore,
      }}
    >
      {children}
    </IrminCoreContext.Provider>
  );
};

export const useIrminCore = () => {
  const context = useContext(IrminCoreContext);
  if (!context) {
    throw new Error('useIrminCore must be used within a IrminCoreProvider');
  }
  return context;
};
