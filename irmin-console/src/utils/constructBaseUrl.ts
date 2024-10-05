/**
 * Properties for constructing a base URL
 *
 * @typeParam pathname - The current pathname (with query parameters and hash fragments if needed)
 * @typeParam segment - The segment to include in the base URL
 * @typeParam protocolAndDomain - Include the protocol and domain in the URL
 * @typeParam includeSegment - If true, includes the specified segment in the returned URL.
 * @typeParam segmentsAfter - Number of segments to include after the specified segment
 * @typeParam keepQueryParams - If true, retains query parameters in the returned URL
 * @typeParam keepHash - If true, retains hash fragments in the returned URL
 */
export interface ConstructBaseUrlProps {
  pathname: string;
  segment: string;
  protocolAndDomain?: boolean;
  includeSegment?: boolean;
  segmentsAfter?: number;
  keepQueryParams?: boolean;
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
    const url = new URL(
      pathname,
      process.env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000'
    );
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
    return pathname;
  }
};
