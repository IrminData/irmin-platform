/**
 * The search parameters from Next JS router.
 * Eg. `searchParams` object in page.tsx components in the props.
 *
 * Note: Does not work in layouts.
 *
 * {@link https://nextjs.org/docs/app/api-reference/functions/use-search-params#layouts}
 */
export type PageSearchParams = { [key: string]: string[] | string | undefined };
