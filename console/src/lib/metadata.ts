import type { Metadata } from 'next';

import { clientEnv } from '@/config/env.client';

/**
 * SEO & metadata primitives.
 *
 * Single source of truth for title composition, description length,
 * robots policies, and the shared brand OG/Twitter card used across every
 * in-app route.
 *
 * The rules enforced here come from DESIGN.md — changes to the title
 * separator set, the 60-char limit, or the collapse behaviour should be
 * discussed with design before landing.
 */

/** Absolute origin used for `metadataBase` and absolute OG/Twitter URLs. */
export const SITE_URL = clientEnv.NEXT_PUBLIC_BASE_URL;

/** Site name rendered as `og:site_name` and in the title suffix. */
export const SITE_NAME = 'Irmin';

/** Separator between the site name and the section portion of a title. */
const SITE_SEPARATOR = ' · ';

/** Separator between segments within the section portion of a title. */
const SEGMENT_SEPARATOR = ' – ';

/** Soft upper bound on title length — Google truncates around 55–60 chars. */
const MAX_TITLE_LENGTH = 60;

/**
 * Budget assumed for the `%s` leaf when composing a `title.template`.
 *
 * Templates are resolved at render time once a child page supplies its leaf
 * title, so we can't know the exact leaf length when we build the template
 * on the server. Dictionary-driven leaf titles (e.g. "Schema", "Branches",
 * "Field mapper") sit comfortably under 20 chars — we budget that much and
 * collapse non-leaf segments until the rest of the template fits the
 * remaining budget. A page that sets an unusually long leaf can still
 * overflow at render time; that's acceptable, and matches the trade-off
 * in DESIGN.md's "never truncate the leaf" rule.
 */
const TEMPLATE_LEAF_BUDGET = 20;

/** Upper bound on description length — Google shows ~155 on desktop. */
const MAX_DESCRIPTION_LENGTH = 155;

/**
 * Compose the full browser-tab title from ordered segments plus the site suffix.
 *
 * The leaf (first) segment is never truncated — that's what the user is
 * looking for. If the natural join exceeds {@link MAX_TITLE_LENGTH}, non-leaf
 * segments are collapsed to their initials starting from the root and walking
 * toward the leaf, one segment at a time, stopping as soon as the result
 * fits. Only when every non-leaf segment has already been collapsed and the
 * title is still too long do we fall back to `"{leaf} · Irmin"`.
 *
 * Examples (assume the natural form would exceed the budget):
 * - `buildTitle(['Very Long Repo Name', 'My Big Corporation Workspace'])` →
 *   `"Very Long Repo Name – M.B.C.W. · Irmin"` (collapse root)
 * - `buildTitle(['Lineage', 'Very Long Repo', 'Very Long Workspace'])` →
 *   `"Lineage – Very Long Repo – V.L.W. · Irmin"` (collapse root first)
 *   → `"Lineage – V.L.R. – V.L.W. · Irmin"` (then middle, if still too long)
 *
 * @param segments - Ordered leaf → root. Empty strings are dropped.
 * @returns The composed title string including the site suffix.
 */
export function buildTitle(segments: Array<string | null | undefined>): string {
  const clean = segments.filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0
  );
  if (clean.length === 0) return SITE_NAME;

  const compose = (parts: string[]): string =>
    parts.join(SEGMENT_SEPARATOR) + SITE_SEPARATOR + SITE_NAME;

  const natural = compose(clean);
  if (natural.length <= MAX_TITLE_LENGTH) return natural;

  // Progressively collapse non-leaf segments to initials. `cutoff` is the
  // left-most index to collapse; it starts at the root (last index) and
  // walks toward — but never into — the leaf at index 0.
  //   [leaf, root]         → [leaf, root→initials]
  //   [leaf, mid, root]    → [leaf, mid, root→initials]
  //                        → [leaf, mid→initials, root→initials]
  for (let cutoff = clean.length - 1; cutoff >= 1; cutoff--) {
    const parts = clean.map((seg, i) =>
      i >= cutoff ? collapseToInitials(seg) : seg
    );
    const candidate = compose(parts);
    if (candidate.length <= MAX_TITLE_LENGTH) return candidate;
  }

  // Every non-leaf segment already collapsed and still too long — drop
  // everything after the leaf.
  return clean[0] + SITE_SEPARATOR + SITE_NAME;
}

/**
 * Build a Next.js `title.template` string that participates in the same
 * length-budget + progressive-collapse rules as {@link buildTitle}.
 *
 * Layouts that own an entity name (workspace, repo, workflow, …) declare a
 * `title.template` like `"%s – ${repo.name} – ${ws.name} · Irmin"` that
 * descendant pages compose against. Interpolating raw entity names at
 * build time means long names blow past the 60-char budget as soon as a
 * child page adds a leaf segment. This helper applies the same root-first
 * progressive initial-collapse {@link buildTitle} uses, but measures length
 * against {@link TEMPLATE_LEAF_BUDGET} standing in for the future `%s`.
 *
 * Returns the template with literal `%s` in the leaf slot, ready to pass to
 * Next.js `title.template`. The helper also returns the resolved segments
 * so callers can share them with `title.default` via {@link buildTitle}.
 *
 * @param nonLeafSegments - Ordered inner → root (no placeholder, no site).
 */
export function buildTitleTemplate(
  nonLeafSegments: Array<string | null | undefined>
): string {
  const clean = nonLeafSegments.filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0
  );
  if (clean.length === 0) return `%s${SITE_SEPARATOR}${SITE_NAME}`;

  // Reserve the leaf budget up front so templates collapse against the same
  // 60-char ceiling a child page will render against at request time.
  const pseudoLeaf = 'X'.repeat(TEMPLATE_LEAF_BUDGET);
  const composeWithLeaf = (parts: string[], leaf: string): string =>
    [leaf, ...parts].join(SEGMENT_SEPARATOR) + SITE_SEPARATOR + SITE_NAME;

  if (composeWithLeaf(clean, pseudoLeaf).length <= MAX_TITLE_LENGTH) {
    return composeWithLeaf(clean, '%s');
  }

  // Collapse non-leaf segments root-first, mirroring buildTitle. `cutoff`
  // is the left-most non-leaf index to collapse (0 = the segment right
  // after the leaf).
  for (let cutoff = clean.length - 1; cutoff >= 0; cutoff--) {
    const parts = clean.map((seg, i) =>
      i >= cutoff ? collapseToInitials(seg) : seg
    );
    if (composeWithLeaf(parts, pseudoLeaf).length <= MAX_TITLE_LENGTH) {
      return composeWithLeaf(parts, '%s');
    }
  }

  // All non-leaf segments collapsed and still too long — drop them entirely
  // and let the leaf + site suffix stand alone.
  return `%s${SITE_SEPARATOR}${SITE_NAME}`;
}

/**
 * Collapse a segment to its word initials.
 *
 * "Tim's Office" → "T.O.", "demo-data" → "D.D.", "Workflows" → "W.".
 */
function collapseToInitials(segment: string): string {
  const initials = segment
    .split(/[\s\-_/]+/)
    .map((word) => word[0])
    .filter(Boolean)
    .map((letter) => letter.toUpperCase() + '.')
    .join('');
  return initials || segment;
}

/**
 * Clamp a description to {@link MAX_DESCRIPTION_LENGTH} characters.
 *
 * Falls back to the caller-provided fallback when the input is null/empty.
 * Never adds a trailing ellipsis — browsers already render one when they
 * truncate on their own.
 */
export function clampDescription(
  text: string | null | undefined,
  fallback: string
): string {
  const source =
    typeof text === 'string' && text.trim().length > 0 ? text.trim() : fallback;
  if (source.length <= MAX_DESCRIPTION_LENGTH) return source;
  return source.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd();
}

/**
 * Robots policy for authenticated console routes. No indexing, no following
 * internal links, and no caching of whatever the crawler managed to scrape.
 */
export const ROBOTS_CONSOLE: Metadata['robots'] = {
  index: false,
  follow: false,
  nocache: true,
};

/**
 * Robots policy for auth routes (sign-in, sign-up, invite). Not indexed,
 * but links out are followed so the referring pages can still distribute
 * link authority through the auth flow.
 */
export const ROBOTS_AUTH: Metadata['robots'] = {
  index: false,
  follow: true,
};

/**
 * Default Open Graph metadata applied at the root layout.
 *
 * The `og:image` itself comes from the `src/app/opengraph-image.tsx` file
 * convention — Next.js auto-injects it on every descendant that does not
 * override it, which is the behaviour we want across the whole console.
 */
export const DEFAULT_OPEN_GRAPH: Metadata['openGraph'] = {
  siteName: SITE_NAME,
  type: 'website',
};

/**
 * Default Twitter metadata. The `twitter-image.tsx` file convention pairs
 * with this — Next.js will not fall back from `opengraph-image` to Twitter,
 * so the sibling file must exist.
 */
export const DEFAULT_TWITTER: Metadata['twitter'] = {
  card: 'summary_large_image',
};
