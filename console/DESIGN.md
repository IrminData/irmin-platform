# DESIGN.md — Irmin Console

**Concept.** The Console shares the **Almanac** visual system with the Irmin marketing site — cream paper + warm ink, a single lime accent, hairline rules, flat surfaces, Fraunces display + IBM Plex Sans body + IBM Plex Mono for labels and code. Any Console surface should read as a sibling page to the website: same fonts, same tokens, same hover behavior, same logo, same favicons.

The Console is a tool. Structure, UX flows, interactive components, and data visualization carry the weight — motion stays minimal and functional. The website's `DESIGN.md` at `../irmin-website/DESIGN.md` is the canonical source for anything shared; this file captures Console-specific rules.

**Who it's for.** Developers and data engineers running Irmin as their data platform. Reference siblings: GitHub, Supabase, Neon — density, precision, no flash.

## Typography

| Role    | Family                                                  | Usage                                                                                  |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Display | **Fraunces** (Google, variable: `opsz`, `SOFT`, `WONK`) | Page `<h1>` via `DisplayTitle`, the wordmark `<Logo />`, blockquotes. Rare on purpose. |
| Sans    | **IBM Plex Sans** (Google)                              | Body, nav, buttons, form fields, table cells. Base **14 px** / line-height 1.6.        |
| Mono    | **IBM Plex Mono** (Google)                              | Eyebrows, form labels, identifiers, cell numerics (`tabular-nums`), code, captions.    |

Fonts load via `next/font/google` in `src/app/layout.tsx` and expose three CSS variables: `--font-fraunces`, `--font-plex-sans`, `--font-plex-mono`. Tailwind aliases `font-display`, `font-sans`, `font-mono`. Legacy `font-main` / `font-serif` classes still resolve (aliased to Plex Sans and Fraunces respectively).

**Scale.** 11 px mono label / 12 px small / 13 px compact UI / 14 px body / 16 px large body / 18 px subtitle / 24–30 px display via `DisplayTitle`. Data tables and metadata panels live at 13–14 px. Use fixed sizes — fluid `clamp()` type belongs in editorial hero contexts, not the app.

**Utilities** (in `src/styles/utilities.css`):

- `.type-display` / `.type-display-tight` — Fraunces axis settings, hero scale.
- `.type-mono-label` — 11 px uppercase mono, 0.14em tracking. Always for form labels, eyebrows, column headers.
- `.type-mono-small` — 12 px mono, normal case. Captions, meta.
- `.link-underline` — accent underline that scales on hover/focus.

Always use `DisplayTitle` over inlining `<h1 className="text-3xl font-bold">`.

## Color — `src/styles/theme.css`

Cream paper canvas (light) or warm ink canvas (dark), with **one** sharp accent: **acid lime**. No gradients. No secondary accents. No colored backgrounds on sections — cards separate via hairline rules, not fills.

```
Light:
  --background  42 30% 95%    /* warm paper */
  --foreground  180 10% 10%   /* ink */
  --accent      72 80% 32%    /* acid lime (AA on cream) */
  --card        42 28% 97%
  --muted       42 18% 87%    /* one step darker than bg — visible on cream */
  --border      42 12% 78%    /* warm; hairlines read against paper */

Dark:
  --background  170 8% 6%     /* warm near-black */
  --foreground  42 28% 92%    /* paper */
  --accent      72 88% 62%    /* same lime, nudged brighter */
  --card        170 8% 9%
  --muted       170 6% 12%
  --border      170 6% 16%
```

**Console override — muted / border are tuned one notch stronger on light than the website.** The marketing site's paper aesthetic reads well with barely-there borders because each section already carries a `§` number and generous padding. In-app tables, search fields, and skeletons have none of that — they need a visible baseline or they dissolve into the cream canvas. We keep the same cream/ink intent; we just push muted/border contrast up by ~3-5% lightness on light mode. Dark mode values match the website.

Every surface pulls from semantic tokens (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `text-accent`), so both themes work without branching code.

**Chart palette.** Five distinct hues tuned for cream/ink, harmonized with lime. Exact values in `--chart-1` through `--chart-5`.

| Chart | Light HSL     | Dark HSL      | Role                       |
| ----- | ------------- | ------------- | -------------------------- |
| 1     | `72 70% 38%`  | `72 80% 58%`  | Lime-olive (accent anchor) |
| 2     | `200 55% 40%` | `200 60% 58%` | Slate-teal                 |
| 3     | `25 75% 48%`  | `25 80% 62%`  | Rust                       |
| 4     | `280 35% 50%` | `280 45% 68%` | Plum                       |
| 5     | `42 30% 40%`  | `42 30% 62%`  | Warm brown                 |

**Legacy `irmin-*` palette — aliased, not extended.** Pre-Almanac code used `bg-irmin-blue-500`, `text-irmin-green-700`, etc., across ~30 files. Those token names remain defined in `@theme inline` but now map to Almanac semantic tones (greens → lime, blues/teals → ink/paper neutrals, blacks → deep ink). Old call sites render in the new palette without a sweep. **New code must use semantic tokens.** Each legacy reference is a paper cut the next pass through the file should clean up.

## Visual primitives

- **Grain overlay** — SVG fractal noise, `mix-blend-multiply` (light) / `overlay` (dark), 6 %/12 % opacity, fixed on `body::after`, non-interactive. Defined in `src/styles/base.css`.
- **Dot grid** — `.dot-grid` / `.dot-grid-dense` radial-gradient utilities for empty states and hero backgrounds. Use sparingly — most empty regions belong to skeletons.
- **Hairline rules** — 1 px `border-border` separates every section and every card. No fills, no shadows. `border-b border-border` is the workhorse.
- **Radius** — `--radius: 0.125rem` (2 px). Minimal. Avatars and dots can go to `rounded-full`.
- **Shadows** — **none.** No `shadow-*` classes anywhere. Lift via background (`bg-card` vs. `bg-background`). Reject on sight.

## Logo

The wordmark is a single instance of **Fraunces** variable, locked at `opsz 60 · SOFT 20 · WONK 1 · wght 600` with tracking `-0.03em`, plus a single lime accent dot sized `0.32em` at `0.18em` trailing margin and `translateY(-0.08em)`. The recipe lives in [src/components/Logo/Logo.tsx](src/components/Logo/Logo.tsx) and every in-app rendering flows through it.

Render with `<Logo />` everywhere in-app. It inherits `currentColor`, so it theme-flips without a light/dark variant — pass `className="text-[1.25rem]"` (or similar) to scale. For external/raster surfaces that need the mark without Fraunces loaded (OG images, Clerk theming, emails, decks) use the SVGs under `public/brand/`: wordmarks, icons, lockups (horizontal + vertical), avatars, favicons, and the standalone accent dot. The raster favicon pack lives at `public/brand/favicon/`.

**Icon.** The lowercase `i` from the wordmark with its tittle replaced by the acid-lime dot. Use only on surfaces too small for the wordmark (favicons, app icons, tight chrome). Everywhere else, the wordmark is the right answer.

**Do**

- Render in-app via `<Logo />` so the mark inherits `currentColor`.
- Keep the lime dot lime. One token, one value, rare by design.

**Don't**

- Don't rebuild the wordmark from a non-Fraunces font.
- Don't recolor, darken, or desaturate the lime dot for contrast.
- Don't stretch, skew, outline, or drop-shadow the logo.
- Don't reintroduce the old Irmin blue/teal/green palette alongside the mark.

### Name in copy — Irmin, not IRMIN

The logotype is lowercase `irmin` because the Fraunces wordmark is rendered that way, not because the name is spelled lowercase.

- **Prose, titles, metadata, alt text, schema.org `name`:** `Irmin`.
- **Logotype, `<Logo />`, SVG paths:** stays `irmin`.
- **Mono chrome** (eyebrows, footer colophon, avatar labels): lowercase `irmin` is allowed as a design register.
- **URLs, package names, code identifiers, domains:** lowercase (`irmin.app`, `github.com/irmin-co`).
- **Never `IRMIN` (all caps).** Reads as an acronym. Fix on sight.

## Motion principles

Minimal-functional. Motion clarifies cause and effect; it never performs.

- **Durations.** `duration-75` (50 ms micro) / `duration-150` (short, hover default) / `duration-200` (buttons) / `duration-300` (drawers, sheets).
- **Easing.** `ease-out` for entries, `ease-in` for exits, `ease-in-out` for reversible (sidebar fold). Tailwind default for micro color/opacity flips.
- **Transition properties.** List them explicitly — never `transition-all` / bare `transition`. Canonical: `transition-[color,background-color,border-color] duration-150`.
- **`prefers-reduced-motion: reduce`** honored globally in `base.css` (durations clamp to 0.01 ms). Don't override per-component.
- **Scope.** Motion clarifies cause and effect: hover, focus, drawer open, sidebar fold, skeleton pulse. Nothing decorative.

## Spacing

Density is the Console's differentiator.

- **Base unit:** 4 px. Scale `xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)`.
- **Card padding:** 20–24 px (`p-5` / `p-6`).
- **Table cell padding:** 10–12 px.
- **Input padding:** underline-only collapses horizontal padding; labels sit above.
- **App layout:** sidebar (240–280 px) + main content; full width inside `<main>`.
- **Prose** (docs, help surfaces): `max-w-prose` (~68ch).

Content spacing lives in page-level layouts — the Console has no global section-padding token.

## Form fields

All form fields use an **underline-only** treatment — no boxed inputs, no rounded corners, no filled backgrounds. Single `border-b border-input` hairline; `focus:border-accent` flips it lime. Padding is `py-2.5`, `px-0`.

- **Inputs** — [src/components/ui/input.tsx](src/components/ui/input.tsx). The Console `Input` retains the existing `icon`, `loading`, and `longtext` props so in-app callers don't break. The wrapper owns the underline + focus treatment; inner `<input>` stays unstyled.
- **Textareas** — [src/components/ui/textarea.tsx](src/components/ui/textarea.tsx). Same underline + `field-sizing: content` + `min-h-24`. **Do not hard-code `rows={N}`** — a fixed `rows` attr defeats content sizing and leaves a floating gap above the next element.
- **Labels** — `.type-mono-label`, above the field. Not inside (no floating labels), never placeholder-only.
- **Required mark** — `*` suffixed to the label, `text-accent`.
- **Error state** — `aria-invalid:border-destructive` on the field + `role="alert"` destructive text below.
- **Exception — data-sheet grid.** Cell editors in `react-datasheet-grid` need a visible box for edit affordance. Pass a `className` on the wrapper to reintroduce `border border-input` + `bg-card` — those are functional overrides, not aesthetic.

## Button chrome

All interactive buttons use the shared `Button` component — [src/components/ui/button.tsx](src/components/ui/button.tsx). Key rules:

- **Cursor** — always `cursor-pointer` on native `<button>`. Tailwind class, not browser default.
- **Disabled** — `disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed`.
- **Focus ring** — `focus-visible:outline-1 outline-accent/70 outline-offset-1`. Softer than the website's 2 px offset 2 ring; at Console density an aggressive halo wraps half the chrome on screen (tabs, icon buttons).
- **Transition** — explicit: `transition-[color,background-color,border-color,transform] duration-150 ease-out`.
- **Radius** — `rounded-[2px]` across all variants.
- **Scale on press** — `active:scale-[0.96]`, disabled on `disabled` state.
- **No global `border` in the base** — the base class does NOT reserve a 1 px stroke. Each variant that wants a visible border adds `border border-<color>` explicitly. This keeps `ghost`, `link`, and the theme/fold icon buttons truly borderless on cream — otherwise the base.css `border-color: var(--border)` fallback would bleed a tinted 1 px edge through.

| Variant       | Idle                                           | Hover                     |
| ------------- | ---------------------------------------------- | ------------------------- |
| `default`     | Transparent, no border, foreground text        | Muted bg                  |
| `outline`     | Transparent, hairline border, foreground text  | Muted bg, stronger border |
| `secondary`   | Secondary bg, no visible border                | Muted bg                  |
| `accent`      | Lime bg, accent-fg text, accent border         | Slight opacity drop       |
| `ghost`       | Transparent, no border                         | Muted bg                  |
| `link`        | Underlined, accent decoration 1 px, no border  | Thickness → 2 px          |
| `destructive` | Destructive bg, destructive border             | Slight opacity drop       |
| `gradient`    | _legacy alias_ — renders identical to `accent` |                           |
| `gray`        | Card bg, no border                             | Muted bg                  |

**Console override — `default` is quiet by default.** The website uses a solid `bg-foreground` fill on its default button. In-app, nearly every surface already carries chrome (cards, rows, table headers, list items, top-nav action bars). Layering a bordered/filled button on top of that stack produces pill-grids that read as visual noise. The Console's `default` is therefore borderless and transparent at idle with only a `hover:bg-muted` state. Pick variants deliberately:

- `default` or `ghost` — almost everything. Inline text actions, nav items, icon buttons.
- `outline` — when the button needs to read as a tappable container (a primary form action without brand weight).
- `accent` / `gradient` — brand-forward CTAs (Create, Commit, Save).
- `destructive` — dangerous actions.

One button → one variant. If you catch yourself wanting a bordered + filled pill for a tertiary action, pick ghost and let the surrounding structure carry the affordance.

Sizes: `sm` (h-9 · px-4) / `default` (h-10 · px-5) / `lg` (h-12 · px-7) / `icon` (size-10). `iconFirst` controls flex direction. For navigation, always pass `href` to `Button` (it renders as `<Link>`); never nest `<Link>` around a `Button` (invalid HTML).

## Responsiveness

Mobile-first. Console layouts must render cleanly from 375 px up, expose the sidebar at `md ≥ 48rem` (768 px), and take full advantage of wider rows at `lg ≥ 64rem` (1024 px) and beyond.

**Breakpoints** (Tailwind defaults, confirmed against `src/styles/theme.css`):

- `sm` 40rem · rarely used, mobile variance only
- `md` 48rem · tablet — sidebar emerges
- `lg` 64rem · desktop baseline
- `xl` 80rem · generous desktop
- `2xl` 86rem · upper bound

Use `md:` / `lg:` to step up from mobile defaults. Avoid `sm:` overrides on desktop defaults.

## Accessibility

Non-negotiable. Every PR passes these.

### Semantic HTML first

`<button>` for actions; `<a>` / `<Link>` for navigation. No `<button onClick={router.push}>`. No `<Link><button>` nesting. Use landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`).

### Focus

Every interactive element carries a visible focus ring: `focus-visible:outline-2 outline-accent outline-offset-2`. Never `outline-none` without an equivalent replacement.

### ARIA — claim only what you implement

`role="dialog"` requires focus trap + Escape + focus return. `aria-controls` target must exist in the DOM. Icon-only button → `aria-label`. Decorative icon adjacent to text → `aria-hidden="true"`.

### Keyboard

Arrow keys inside compound widgets (tabs, listbox, menu, combobox). Escape dismisses overlays. Tab order matches visual order.

### Heading hierarchy

One `<h1>` per page via `DisplayTitle`, then `<h2>` / `<h3>`. No skipping levels.

### Translations include ARIA

Every `aria-label`, `title`, `alt`, and error string flows through the dictionary (`useLocale().dict`). Hardcoded English fails review.

### Hover & interactive states

Every interactive element has a visible `hover:` state shift. Transition uses explicit property lists, never `transition-all`.

### Touch

44 × 44 minimum hit target on mobile. `touch-action: manipulation` on interactive elements to remove the 300 ms delay.

### Contrast

Cream/ink/lime palette passes AA at the token level. Large-text-only exception for `text-accent` on cream — **do not** use accent for body copy.

## Content & Copy

### Voice

Console copy is functional, precise, second-person — the voice of a tool.

- Active voice: "Save changes" not "Changes can be saved".
- Second person: "You control the schema".
- Specific button labels: "Request access" / "Run query" — never "Submit" / "OK".
- No marketing clichés: ban "unlock", "leverage", "seamlessly", "game-changing".

### Typography micro-rules

- **Title Case** for buttons and page headings; **sentence case** in body.
- **`&` over `and`** in UI labels ("API & MCP"); full word `and` in body copy.
- **Ellipsis `…` (U+2026)**, never `...`.
- **Curly quotes `" "` / `' '`** in prose; straight in code.
- **Non-breaking spaces** between values and units (`10&nbsp;MB`, `200&nbsp;ms`), shortcut modifiers (`⌘&nbsp;K`), brand names (`Anthropic&nbsp;Claude`).
- **`text-wrap: balance`** on display titles (default in `DisplayTitle`).
- **`tabular-nums`** on anything numeric that changes in place.

### Empty states

Say what's missing and what to do. "No workflows yet — create one" beats "Nothing here". Pair with a primary CTA.

### Loading copy

If a spinner carries text, make it specific: "Fetching schema…" not "Loading…". Spinner-only is fine for sub-200 ms hits.

### Dates, numbers, identifiers

- Dates: `Intl.DateTimeFormat(locale)`.
- Numbers: `Intl.NumberFormat(locale)`.
- Identifiers (slugs, UUIDs, commit SHAs): wrap in `<span translate="no">` so browser translation doesn't corrupt them.

### Error copy

Say what failed and what to try. Include the retry affordance. No stack traces in user-facing copy — those belong in Sentry.

## Images

- Every `<img>` / `next/image` / `<Media>` has an `alt`. Empty (`alt=""`) for decorative is fine; **missing** is not.
- Informational images describe the meaning, not "image of X".
- Every `<Image>` has explicit `width` / `height` to avoid CLS.
- Reserve `priority` for the single above-the-fold critical image per page.

## Error States

Three-tier boundary system.

### Boundary tiers (catastrophic → local)

| Tier | Component                    | Scope                |
| ---- | ---------------------------- | -------------------- |
| 1    | `global-error.tsx`           | Whole document       |
| 2    | `[lang]/(console)/error.tsx` | Console content area |
| 3    | `<SafeComponent>`            | Contained region     |

### Primitives — `src/components/ui/error/`

- `CommonErrorDisplay` — pure component; accepts `translations` (works outside `LocaleProvider`).
- `LocalizedErrorHandler` — wraps the pure component with `useCommonErrorTranslations`.
- `SafeComponent` — `ErrorBoundary` wrapper for subtrees.
- `ErrorBoundary` — class-based React boundary.
- `QueryError` — TanStack Query error state.
- `AuthenticationErrorHandler` — mounted **inside** layouts (around `<main>`), not at the provider level. Provider-level mounting wipes the sidebar / search / theme toggle on a profile-fetch failure.

## Loading & Skeleton States

### When to skeleton vs. spin vs. nothing

- **Nothing** — static surfaces, pre-fetched data, SSR routes.
- **Spinner** — transient user actions (form submit, save).
- **Skeleton** — client-fetched surface that takes > 200 ms.

### Mirror principle

A skeleton is a drop-in silhouette of the real thing:

1. Same outer shape (width, padding, border, radius).
2. Same internal rhythm (rectangles, gaps, responsive reflow).
3. Same responsive behavior (stack, hide columns, reflow at the same breakpoints).
4. Same count (6 real items → 6 skeleton rows).

One skeleton per surface. Never sequence two different skeletons on the same list.

### Tokens

`bg-muted`, never raw grays. Use `LoadingSkeleton` — the primitive in `src/components/ui/loading/LoadingSkeleton.tsx` — and compose it.

### Motion

`animate-pulse` (Tailwind default); respects `prefers-reduced-motion`.

### Keep skeletons in lockstep with the real component

Any change to container shape, column count, row count, header, or buttons must update the paired skeleton (either next to the component or the nearest `loading.tsx`) **in the same commit**. A skeleton that no longer mirrors causes a layout jump on data arrival. Common drifts: adding a column, adding a header button, swapping a chip for a badge, adding a second-row metadata block.

## SEO & Metadata

The Console's public perimeter is thin (sign-in, accept-invite, landing redirects). In-app content is authenticated and carries `noindex, nofollow`.

### Title pattern

`{Leaf entity} – {Workspace name} · Irmin`. Max 60 chars.

- `·` (U+00B7 middle dot) separates site from section.
- `–` (U+2013 en dash) separates segments.
- Title composition lives in `src/lib/metadata.ts`; extend there, not inline.

### Description

150–160 chars. Front-load important words.

### Open Graph + Twitter Card

Both required. Drop `· Irmin` from OG title (the card shows the site). Default OG/Twitter cards ship via `src/app/opengraph-image.tsx` / `src/app/twitter-image.tsx` (Next.js file conventions).

### Robots & indexing

Public routes: `index, follow`. In-app routes: `noindex, nofollow`. Use the helper in `src/lib/metadata.ts`.

### Favicon, icons, theme-color

- `src/app/favicon.ico` · `src/app/icon.png` · `src/app/apple-icon.png` — sourced from the Almanac `public/brand/favicon/` pack. Already the new set.
- `viewport.themeColor` — `#f4eedf` (cream) light / `#0e1010` (ink) dark. Defined in `src/app/layout.tsx`.

### Logo assets for external surfaces

`public/brand/` ships the shared Almanac set:

- `lockup-horizontal-*.svg` · `lockup-vertical-*.svg` — lockups.
- `wordmark-*.svg` — wordmark only.
- `icon-*.svg` — icon only.
- `avatar-*.svg` — square avatars.
- `dot-accent*.svg` — isolated lime dot.
- `favicon/*.png` — raster favicon pack (16 · 32 · 48 · 180 · 192 · 512 in light and dark).

Variants: `light`, `dark`, `mono-black`, `mono-white`, `safe-*`, `lime-badge-*`, `currentColor`.

## Anti-patterns

Reject in review.

### HTML / semantics

- `<div onClick>`, `<button onClick={router.push}>`, `<Link><button>` nesting.
- Missing `alt` on images, missing `width` / `height`, heading-level skips.

### ARIA

- Claims that aren't backed by behavior (`role="dialog"` without focus trap).
- `aria-controls` pointing at an id that doesn't exist.
- Hardcoded English in `aria-label` / `title` / `alt`.

### Focus / keyboard

- `outline-none` without a visible focus replacement.
- `focus:` (bare) when `focus-visible:` is intended.
- `tabIndex={0}` on natively focusable elements. `autoFocus` on mobile.

### Forms

- Placeholder-only labels. Floating labels.
- Boxed inputs outside data-sheet cells.
- Hard-coded `rows={N}` on `<Textarea>`.
- `onPaste + preventDefault`. Submit pre-disabled.

### Motion

- `transition-all` / `transition` (bare) — always list properties.
- Animating layout (`width`, `top`, `left`, `margin`) — use `transform`.
- Decorative animation (bouncing, parallax, auto-rotating carousels).
- Per-component override of `prefers-reduced-motion`.

### Styling

- Gradients. Any kind.
- Drop-shadows. `shadow-sm`, `shadow-xs`, `drop-shadow-*`.
- Rounded cards (> 2 px) — `rounded-full` reserved for avatars/dots.
- Raw Tailwind grays (`bg-gray-*`, `dark:*-gray-*`) — use `bg-muted` / `bg-card`.
- Hardcoded hex colors / font families other than Fraunces / Plex Sans / Plex Mono.
- Recoloring the lime dot for contrast.

### Performance

- `.map()` over > 50 items without virtualization.
- Reading layout in render (`getBoundingClientRect` outside an effect).
- Controlled `<input>` re-rendering a large tree per keystroke.
- Hardcoded pixel widths on responsive images. `priority` on every `<Image>`.

### Copy

- `IRMIN` (all caps).
- Straight quotes in prose. `...` instead of `…`.
- Marketing clichés ("unlock", "leverage", "seamlessly", "game-changing").
