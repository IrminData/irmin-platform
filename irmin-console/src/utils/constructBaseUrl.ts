import { clientEnv } from '@/config/env.client';

/**
 * Properties for constructing a base URL
 */
export interface ConstructBaseUrlProps {
  /** The current pathname (with query parameters and hash fragments if needed) */
  pathname: string;
  /** The segment to include in the base URL */
  segment: string;
  /** Include the protocol and domain in the URL */
  protocolAndDomain?: boolean;
  /** If true, includes the specified segment in the returned URL. */
  includeSegment?: boolean;
  /** Number of segments to include after the specified segment */
  segmentsAfter?: number;
  /** If true, retains query parameters in the returned URL */
  keepQueryParams?: boolean;
  /** If true, retains hash fragments in the returned URL */
  keepHash?: boolean;
}

/**
 * Construct a base URL from a given pathname and segment,
 * optionally retaining query parameters and hash fragments.
 *
 * @param props - Base URL construction properties {@link ConstructBaseUrlProps}
 * @returns The constructed base URL
 */
export const constructBaseUrl = ({
  pathname,
  segment,
  protocolAndDomain = false,
  includeSegment = true,
  segmentsAfter = 0,
  keepQueryParams = false,
  keepHash = false,
}: ConstructBaseUrlProps) => {
  try {
    const url = new URL(pathname, clientEnv.NEXT_PUBLIC_BASE_URL);
    const segments = url.pathname.split('/').filter(Boolean);
    const segmentIndex = segments.indexOf(segment);

    if (segmentIndex === -1) return pathname;

    const endIndex = includeSegment
      ? segmentIndex + 1 + segmentsAfter
      : segmentIndex + segmentsAfter;
    const basePath = '/' + segments.slice(0, endIndex).join('/');

    // Construct the final URL
    let finalUrl = basePath;

    if (protocolAndDomain) {
      finalUrl = `${url.origin}${basePath}`;
    }

    if (keepQueryParams && url.search) {
      finalUrl += url.search;
    }

    if (keepHash && url.hash) {
      finalUrl += url.hash;
    }

    return finalUrl;
  } catch (e) {
    console.warn('Error constructing base URL:', e);
    return pathname;
  }
};
