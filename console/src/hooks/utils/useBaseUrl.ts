import { useMemo } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import type { ConstructBaseUrlProps } from '@/utils/constructBaseUrl';
import { constructBaseUrl } from '@/utils/constructBaseUrl';

/**
 * Hook to construct a base URL using the currently active URL.
 *
 * @param props - Base URL construction properties {@link ConstructBaseUrlProps}
 */
export function useBaseUrl(props: ConstructBaseUrlProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const baseUrl = useMemo(() => {
    const fullUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return constructBaseUrl({
      ...props,
      pathname: fullUrl,
    });
  }, [pathname, searchParams, props]);

  return baseUrl;
}
