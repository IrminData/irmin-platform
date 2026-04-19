# Design System — Irmin

## Product Context

- **What this is:** Data warehouse and management platform with git-like versioning, workflow orchestration, and AI-powered analytics
- **Who it's for:** Developers and data engineers who want GitHub-style workflows for data
- **Space/industry:** Data platforms (peers: Snowflake, Databricks, MotherDuck, Supabase, Neon)
- **Project type:** Web app / data dashboard with marketing site

## Aesthetic Direction

- **Direction:** Industrial/Utilitarian with a developer-data focus
- **Decoration level:** Minimal — typography and spacing do the work
- **Mood:** Professional, technical, trustworthy. GitHub for data. Not flashy, not corporate. Feels like a tool built by engineers for engineers.
- **Reference sites:** Supabase (dark mode benchmark), Neon (developer aesthetic), GitHub (information density)

## Typography

- **Display/Hero:** Geist Sans bold — condensed display faces fight readability in a dense data-platform UI. Bold weight + tight tracking carries the hierarchy without a second typeface.
- **Body:** Geist Sans — clean geometric sans-serif, excellent readability at 14px
- **UI/Labels:** Geist Sans (same as body)
- **Data/Tables:** Geist Sans with tabular-nums feature, or Geist Mono for code/IDs
- **Code:** Geist Mono
- **Serif accent:** Lora — for blockquotes, testimonials, editorial content
- **Loading:** Self-hosted variable fonts via Next.js localFont
- **Scale:** 11px (labels) / 12px (small) / 13px (compact UI) / 14px (body) / 16px (large body) / 18px (subtitle) / 24-30px (display, Geist Sans bold)
- **Body base:** 14px, line-height 1.6

## Color

### Approach

Restrained — blue primary (HSL 197) plus green accent (HSL 137), with neutral teal for secondary surfaces. One warm amber and one violet reserved for chart differentiation only.

### Primary — Irmin Blue

| Stop | HSL            | Usage                             |
| ---- | -------------- | --------------------------------- |
| 100  | 197, 100%, 90% | Light backgrounds, hover          |
| 200  | 197, 65%, 81%  | Light borders, subtle highlights  |
| 300  | 197, 49%, 68%  | Disabled states                   |
| 400  | 197, 29%, 44%  | Secondary text on light           |
| 500  | 197, 67%, 27%  | **Primary actions, links, brand** |
| 600  | 197, 67%, 20%  | Hover states for primary          |
| 700  | 197, 67%, 14%  | Active states                     |
| 800  | 197, 67%, 10%  | Dark surfaces                     |
| 900  | 197, 67%, 4%   | Near-black                        |

### Accent — Irmin Green

| Stop | HSL               | Usage                                  |
| ---- | ----------------- | -------------------------------------- |
| 100  | 137, 20%, 94%     | Success backgrounds, light fills       |
| 200  | 137, 20%, 88%     | Hover on success elements              |
| 300  | 137, 22%, 82%     | Borders on success states              |
| 400  | 137, 25%, 76%     | Subtle active indicators               |
| 500  | **137, 35%, 50%** | **Success badges, active branch tags** |
| 600  | **137, 35%, 42%** | **Commit buttons, primary accent CTA** |
| 700  | **137, 35%, 34%** | **Accent hover states**                |
| 800  | 137, 25%, 26%     | Dark accent surfaces                   |
| 900  | 137, 25%, 18%     | Near-black accent                      |

Rationale: Steps 100-400 stay at 20% saturation for subtle backgrounds. Steps 500-700 jump to 35% so success states and CTAs pop. Steps 800-900 ease back to 25%.

### Neutrals

- **Irmin Teal** — HSL 197 at 18% saturation, lightness 90→10 (100→900).
- **Irmin Black** — HSL 197 at 90–100% saturation, lightness 83→1 (100→900). Dark surfaces, deep backgrounds.

### Semantic Colors

- **Success:** Irmin Green 500–600
- **Warning:** HSL(45, 93%, 47%) — amber
- **Error/Destructive:** HSL(0, 84%, 66%) light / HSL(0, 84%, 37%) dark
- **Info:** Irmin Blue 300–400

### Chart Palette

| Chart | HSL           | Name   | Role                       |
| ----- | ------------- | ------ | -------------------------- |
| 1     | 197, 67%, 55% | Blue   | Primary brand, brightened  |
| 2     | 137, 35%, 55% | Green  | Accent, boosted saturation |
| 3     | 32, 80%, 58%  | Amber  | Warm contrast hue          |
| 4     | 280, 40%, 60% | Violet | Max hue separation         |
| 5     | 197, 30%, 45% | Teal   | Secondary brand            |

Five distinct hues, not monochromatic — data viz needs instant series separation.

### Theme tokens

Each mode defines one canonical value per semantic slot. Blue-tinted neutrals throughout — raw grays break cohesion (see Anti-patterns).

| Token            | Light         | Dark          |
| ---------------- | ------------- | ------------- |
| Background       | `0 0% 100%`   | `197 94% 4%`  |
| Card             | `0 0% 98%`    | `197 98% 10%` |
| Muted            | `200 24% 93%` | `197 30% 11%` |
| Muted foreground | `197 10% 40%` | `197 15% 52%` |
| Border           | `197 15% 91%` | `197 66% 15%` |

See `src/styles/theme.css` for the full token set. Decisions Log carries the rationale for each value.

## Spacing

- **Base unit:** 4px
- **Density:** Compact — this is a data platform, information density matters
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Card padding:** 20-24px (p-5 or p-6)
- **Input padding:** 8-12px horizontal
- **Table cell padding:** 10-12px

## Layout

- **Approach:** Grid-disciplined — consistent columns, predictable alignment
- **Grid:** Sidebar (240-280px) + main content area
- **Max content width:** 1200px for marketing, full-width for app
- **Border radius:** sm(4px) md(8px/0.5rem) lg(12px) xl(16px) full(9999px for badges/pills)

## Motion

- **Approach:** Minimal-functional — transitions that aid comprehension only
- **Duration:** micro(50-100ms) short(150ms) medium(250ms)
- **Hover transitions:** 100-150ms for color/opacity changes
- **No decorative animations** in the app UI. Save expressive motion for marketing site.
- **Respect `prefers-reduced-motion` globally.** `base.css` caps `animation-duration` and `transition-duration` to 0.01ms site-wide when the user opts in. Components inherit this — don't override per-component.

### Easing

Split by what's moving. Rule of thumb: if the user can perceive _direction_ in the motion, name the easing.

- **Micro** (color, opacity, shadow — anything non-positional ≤ 150ms): Tailwind default `ease`. At that duration the curve is imperceptible.
- **Movement** (transform, width, margin, translate — anything that moves in space): name the easing.
  - Enter (appearing, expanding, translating in): `ease-out`
  - Exit (disappearing, collapsing, translating away): `ease-in`
  - Reversible move (sidebar fold, drawer slide, hamburger morph): `ease-in-out`

## Component Library

- **Base:** Radix UI primitives with shadcn/ui "new-york" style
- **Variants:** CVA (Class Variance Authority) for button/badge/input variants
- **Icons:** Lucide
- **52+ custom UI components** built on the Radix + CVA foundation

## Accessibility

Non-negotiable. Every component ships with these rules satisfied.

### Semantic HTML first

Reach for the right element before reaching for ARIA:

- `<button>` triggers actions; `<a>` / `<Link>` navigates to a URL. Never `<button onClick={router.push}>` — it breaks Cmd/Ctrl+click, middle-click, drag-to-tab.
- `<input>` / `<select>` / `<textarea>` always with a real `<label>` or `aria-label` on the control.
- HTML5 landmarks (`<header>` / `<nav>` / `<main>` / `<aside>` / `<footer>`) over `<div role="...">`.
- `<table>` for tabular data; `<ul>` / `<ol>` for lists.

Every console page has one `<main id="console-content">` (the root-layout skip link targets it). Sidebar is `<aside>`; link groups inside are `<nav aria-label="...">`.

### Focus

- Every interactive element shows a visible focus ring: `focus-visible:ring-1 focus-visible:ring-ring`. Never `outline-none` without a replacement.
- Use `focus-visible:` (keyboard-only) in Tailwind — the bare `focus:` prefix fires on mouse click too.
- `focus-within:` for compound controls (wrapper gains focused styling when any child is focused).
- Opening a modal: focus moves into it. Closing: focus returns to the trigger. Submit-with-errors: focus the first invalid field.
- Don't build a focus trap unless you also ship Escape + focus return. Use Radix `Dialog` / `Popover` for real modals, or render as a disclosure region without claiming `role="dialog"`.

### ARIA — claim only what you implement

- `role="dialog"` + `aria-modal` requires focus trap, Escape handler, focus return. Missing any → drop the role.
- `aria-controls` target must exist when the attribute is set. Gate the attribute on the controlled element's render condition, not on "popup visible".
- `role="listbox"` contains only `option` or `group` children. Loading skeletons, empty states, footer buttons belong outside.
- `role="combobox"` requires `aria-expanded`, `aria-controls`, `aria-autocomplete`, and — if implemented — `aria-activedescendant`.

### Icons & images

- Decorative icon adjacent to a text label: `aria-hidden="true"`.
- Icon-only button or link: `aria-label` describing the action.
- Icon inside a button that also has text: `aria-hidden="true"` on the icon.
- `<img>` / `<Image>`: always `alt`. Decorative is `alt=""` (NOT missing). Informational describes the meaning in context, not "image of X".
- Inline SVG component: `aria-hidden="true"` if decorative, `role="img" aria-label="..."` if informational.

### Keyboard

- Every mouse action works from a keyboard. Tab reaches every interactive element in visual order.
- `tabIndex={0}` only on custom widgets that aren't natively focusable. `tabIndex={-1}` for programmatically-focusable-only elements.
- Browser defaults handle Enter/Space on buttons — don't `preventDefault`.
- Escape dismisses open overlays.
- Arrow keys navigate inside compound widgets (tabs, listbox, menu) — only claim the role if you wire the keys.

### Heading hierarchy

- One `<h1>` per page (`DisplayTitle` renders it).
- Levels hierarchical — no skipping `<h1>` → `<h3>`.
- `scroll-margin-top` on any heading that can be a hash-anchor target. `DisplayTitle` bakes `scroll-mt-20`.

### Translations include ARIA

All user-visible text — **including `aria-label`, `title`, live-region text, and `sr-only` spans** — lives in `dict`. Finnish users hear Finnish. Validate with `pnpm dict:validate`.

### Hover & interactive states

- Every interactive element has a `hover:` state that visibly shifts contrast (color, background, shadow, translate). No imperceptible shade swaps.
- Active/pressed: slightly darker/compressed, ~100ms.
- Disabled on native elements: `disabled` attribute + reduced opacity + `cursor-not-allowed`. On `<a>` / `<Link>` (no native `disabled`): `aria-disabled="true"` + `tabIndex={-1}` + `pointer-events-none`.

### Touch

- Minimum 44×44px hit target on mobile.
- `touch-action: manipulation` on interactive elements removes iOS's 300ms double-tap delay.
- Pad the button, not the icon inside it — hit target is the button's bounding box.

## Forms

The most failure-prone UI surface. Every form follows these rules.

### Inputs

- `autoComplete` on every text input. Standard values: `email`, `current-password`, `new-password`, `given-name`, `organization`, `url`, `one-time-code`.
- Meaningful `name` (`name="email"`, not `name="input-1"`).
- `type` matches content: `email` / `tel` / `url` / `number` / `search`. Ships the right mobile keyboard automatically.
- `inputmode` when `type` isn't enough (numeric PIN: `type="text" inputmode="numeric"`).
- `spellCheck={false}` on emails, URLs, codes, usernames, API tokens, file paths.
- Never block paste. `onPaste` + `preventDefault` is hostile to password-manager users.
- `autoComplete="off"` on non-auth search fields (stops password managers from attempting to fill).
- `autoFocus` sparingly — desktop only, one primary input per page, never on mobile.

### Labels

- Every input gets a real `<label htmlFor>`. `aria-label` only when a visible label isn't appropriate (compact toolbar controls).
- Placeholder is NOT a label. It disappears on focus — user loses context mid-type. Use a real label above + placeholder for format/example.
- Checkbox / radio: wrap with `<label>` or use `htmlFor` — no dead zones between control and text.

### Validation

- Errors inline, next to the offending field. Not a toast, not a top banner.
- On submit: focus the first invalid field.
- Error copy includes the fix: `"Email address is invalid — check for typos after the @"` > `"Email invalid"`.
- Server-side per-field errors surface at the field, not in a generic alert.

### Submit

- Button stays enabled until the request starts. Pre-disabling on `!isValid` hides _why_ the button won't work.
- During the request: spinner inside the button, button disabled, form locked.
- On error: re-enable, surface the error, keep the form state.
- On success: clear feedback + advance the flow.

### Placeholders

- End with `…`. `"e.g., sk-1a2b…"`, `"Search data and more…"`.
- Show the pattern, not the field name. The label already names the field.

### Unsaved changes

- Any form representing persistent state warns before navigation-away with unsaved changes (router guard or `beforeunload`).

### Dark mode native `<select>`

- `base.css` globally sets explicit `background-color` + `color` so Windows dark mode doesn't render white-on-white. Don't override per-select.

## Images

- **`<Image>` over `<img>`** wherever possible — handles width/height, lazy-loading, AVIF/WebP.
- **Explicit `width` + `height`** (or `fill` + sized container). Prevents CLS.
- **`alt` on every image.** Decorative: `alt=""`. Informational: describe meaning in context.
- **`priority`** on the single critical above-the-fold image per page. Not on every hero.
- **`loading="lazy"`** is the default for `<Image>` — keep it.
- **Aspect ratio reserved** during load via dimensions or `aspect-ratio` CSS. No layout shift when the image swaps in.

## Content & Copy

Voice and micro-typography across marketing, in-app, tooltips, errors, empty states.

### Voice

- **Active voice.** "Install the CLI" > "The CLI can be installed".
- **Second person.** "You can invite teammates" > "Users can invite teammates".
- **Specific button labels.** "Save API Key" > "Submit".
- **Numerals for counts.** "8 deployments" > "eight".
- **Title Case for buttons and page headings.** Sentence case in body.
- **`&` over "and"** in space-constrained UI (e.g., "API & MCP"); regular "and" in body copy.
- **First-person-plural or passive for errors.** "We couldn't reach the server" / "Server didn't respond" — never "You did something wrong".

### Typography micro-rules

- **Ellipsis `…` (U+2026), never `...`.** Loading: `"Saving…"`. Placeholders: `"Search…"`. Truncation: `"Long title…"`.
- **Curly quotes `" "` `' '`** in prose, not straight `" "` `' '`. Code stays straight.
- **Non-breaking spaces** between values that shouldn't wrap:
  - Units: `10&nbsp;MB`, `3.5&nbsp;GB`, `200&nbsp;ms`
  - Shortcuts: `⌘&nbsp;K`, `Ctrl&nbsp;K`
  - Brand name + model: `Anthropic&nbsp;Claude`, `OpenAI&nbsp;GPT-5`
- **`text-wrap: balance`** on headings (baked into `DisplayTitle`).
- **`tabular-nums`** on number columns (Typography section).

### Empty states

Tell users (a) what this is, (b) why it's empty, (c) the next step. "No repositories yet. Create your first to start versioning data." Primary action button on every empty state that has a sensible next step.

### Loading copy

Verb + object + `…`: `"Loading workspaces…"`, `"Running query…"`. Never just `"Loading…"` when you know what's loading.

### Dates, numbers, identifiers

- Every date through `Intl.DateTimeFormat(locale)`. Never hardcode `"Jan 5, 2026"` — wrong in Finnish (`5. tammikuuta 2026`).
- Every displayed number through `Intl.NumberFormat(locale)`. Thousands separators differ: `1,234,567` (en) vs `1 234 567` (fi).
- Identifiers stay raw. Slugs, UUIDs, commit SHAs: wrap with `<span translate="no">` so browser auto-translation doesn't mangle them.

### Error copy

Error States section owns the primitive-choice rules. The copy rule across both: entity-specific over generic, include the fix, don't blame the user.

## Error States

The console has a **three-tier error-boundary system** plus two query-specific primitives. Never hand-roll error UI — pick the right primitive and use it.

### Boundary tiers (catastrophic → local)

| Tier             | Component                            | Triggers on         | Scope                                       |
| ---------------- | ------------------------------------ | ------------------- | ------------------------------------------- |
| 1 — catastrophic | `src/app/global-error.tsx`           | Root layout crashes | Whole document. Detects locale from URL.    |
| 2 — route        | `src/app/[lang]/(console)/error.tsx` | Route segment crash | Console content area.                       |
| 3 — section      | `<SafeComponent>` wrapping a subtree | Subtree crash       | Contained region; sidebar/nav stay mounted. |

### Primitives

- **`CommonErrorDisplay`** — base UI (icon + title + description + retry/report/details). Pure; accepts a `translations` prop. Use only _outside_ `LocaleProvider` (e.g., `global-error.tsx`).
- **`LocalizedErrorDisplay`** — wraps `CommonErrorDisplay` with `useCommonErrorTranslations`. Preferred for any in-provider call site.
- **`SafeComponent`** — functional wrapper around `ErrorBoundary` to protect a subtree. `titleKey` / `descriptionKey` point at `dict.common.errors.*`.
- **`ErrorBoundary`** — class-based React boundary. Keys are typed against `Dictionary['common']['errors']`; typos fail at compile time.
- **`QueryError`** — for TanStack Query error states. Pass `error`, `onRetry={() => refetch()}`, optional `title` / `description`.
- **`AuthenticationErrorHandler`** — auth/profile errors. Mounted inside layouts (`(console)/ConsoleWrapper` around `<main>`, `(authentication)/layout.tsx` around its children). Reads `authError` from `IAMContext`. Never mount at provider level — it wipes the app shell on every profile-fetch blip.

### Copy rules

- All user-facing error strings live in `dict.common.errors.*`; mutation alerts under `dict.common.errors.mutations.*` (one entry per CRUD verb × domain).
- No hardcoded English fallbacks: `error.message ?? dict.common.errors.mutations.deleteRepositoryFailed`, never `error.message ?? 'Failed to delete repository'`.
- See Content & Copy for the cross-cutting voice rules (entity-specific over generic, include the fix, don't blame the user).

### Decision tree

1. Is this a **TanStack Query error state**? → `<QueryError error={query.error} onRetry={() => query.refetch()} />`.
2. Is this a **React rendering crash** I want to contain to a region? → Wrap with `<SafeComponent level='section' titleKey='...' descriptionKey='...'>`.
3. Is this a **mutation error** that should toast? → `irminAlert('error', error.message ?? dict.common.errors.mutations.xxxFailed)`.
4. Is this an **auth/profile error** that should redirect or block the content area? → `IAMContext.authError` + the `AuthenticationErrorHandler` already mounted in the layout. Don't add a new one.
5. **Outside a LocaleProvider** (server-side `global-error.tsx` etc.)? → `CommonErrorDisplay` with a manually constructed `translations` object.
6. None of the above (building a new error UI)? → Stop. Compose `LocalizedErrorDisplay` instead.

## Loading & Skeleton States

**A skeleton is a promise — "content is coming, in this exact shape and position."** When it lies about shape or position the layout shifts on data arrival and the perceived-performance win evaporates. Get skeletons right or render nothing.

### Mirror principle

Skeleton matches the real component on all four axes:

1. **Outer shape** — same width, padding, border, radius, shadow.
2. **Internal rhythm** — same rectangles, same widths, same gaps. Real row `[icon 36px] [title 240px] [stats 4×32px] [chevron 16px]` → skeleton row of five rectangles at matching widths.
3. **Responsive behavior** — stacks, hides columns, and reflows at the same breakpoints.
4. **Count** — if the real list renders ~6 items, render 6 skeletons. Same grid columns (`md:grid-cols-2 lg:grid-cols-3`) as the real list.

If you can't mirror closely, render nothing (or a spinner). A wrong shape reflows visibly when data lands — worse than no feedback.

### One skeleton per surface

Never sequence two different skeletons for the same list while data fetches (page-level → list-level → real list in 500ms reads as broken). Pick the most specific, hold it until data is ready. Layout skeleton + list skeleton render together in one tree, not in sequence.

### Tokens

Always semantic tokens, never raw Tailwind grays.

| Use                                      | Not                            |
| ---------------------------------------- | ------------------------------ |
| `bg-muted`                               | `bg-gray-200`                  |
| `dark:bg-muted` (same token, both modes) | `dark:bg-gray-800`             |
| `bg-muted/40` for subtle on-card pulses  | `bg-gray-100 dark:bg-gray-700` |

Raw grays break the blue-tinted (HSL 197) dark palette — the root cause of the "fluctuating skeleton colors" symptom across the codebase.

### Motion

- `animate-pulse` (Tailwind default). Don't layer `transition-opacity` on top — it fights the keyframe.
- Never `opacity-10` or similarly invisible opacities. Target ~80–90% of the card's text-contrast against its background; an invisible skeleton defeats the "loading" signal.
- `prefers-reduced-motion` is handled globally (see Motion section) — new skeletons inherit it for free.

### Primitive

- **`LoadingSkeleton`** (`src/components/ui/loading/LoadingSkeleton.tsx`) — the base building block. A pulsing `bg-muted` rectangle. Compose it, don't replace it.
- **Composed skeletons** live next to it: `PageSkeleton`, `DetailPageSkeleton`, `ListSkeleton`, `TableSkeleton`, `SchemaSkeleton`, etc. When you add a new page or list, add a matching composed skeleton in the same folder and import it from the page's `loading.tsx` (Next.js reads that as the suspense fallback).

### When to use a spinner instead

Skeletons are for content the user is **waiting to read**. Spinners (`<LoadingSpinner>`) are for transient actions the user **triggered**: submitting a form, opening a modal, the first second of an editor mount. If the content will arrive in under 200ms on a healthy connection, a spinner reads better than a shape that flashes away.

### Keep skeletons in lockstep with the real component

**Every UI change that alters a component's shape, container, column count, row count, header layout, or action buttons must update its skeleton in the same commit.** A skeleton that lies is worse than no skeleton — it produces a layout shift the moment real data lands and destroys the trust the shape was supposed to earn. Common drift we've caught in review, all of which have shipped as bugs:

- **Wrong container.** Skeleton uses `max-w-3xl` but real page uses `max-w-7xl` (or vice versa). The skeleton ends up visibly off-center or narrower than the header above it.
- **Skeleton renders its own container that the real component doesn't.** Next the skeleton sits inside the layout's container PLUS its own, and the content is nested too deep.
- **Skeleton container doesn't wrap the tabs.** If the real layout wraps both the header row and its `TabsWithBackButton` in one `container mx-auto max-w-7xl`, the skeleton must too — otherwise tabs drift wider than the header on large viewports.
- **Raw grays left behind.** `bg-gray-200 dark:bg-gray-800` instead of `bg-muted`. Flags the skeleton as stale.
- **Item count mismatch.** Real list renders 8 items but skeleton renders 6 (or vice versa). Page jumps when data lands.
- **Wrong column layout.** Real component is a 2-column `lg:grid-cols-2` form, skeleton is a single-column stack. Or real is a single-column list, skeleton is a 2-column sidebar + grid.
- **Generic fallback for a specific page.** `<FormSkeleton />` on a page that's actually a table-with-banner. `<ListPageSkeleton />` on a page that has no title or search bar. Skeletons named "Form" or "List" aren't license to use them where the real page isn't one.

When you touch a component, grep for its paired skeleton (usually `ComponentName` → `ComponentNameSkeleton` or referenced from the nearest `loading.tsx`) and apply the same structural change. The skeleton lives in `src/components/ui/loading/` and/or the relevant `loading.tsx` in `src/app/`. Both places count.

In review, if the diff touches a section and doesn't touch its skeleton, ask why. A wrong skeleton is a reviewable UI regression, not a polish item.

## SEO & Metadata

Metadata is a design surface — tab titles, bookmarks, share previews, search results are all first-impression moments. Never let Next.js fall back to a slug-reconstructed title.

### Three surfaces, one source

| Surface        | Reads                                                 | Audience                                    |
| -------------- | ----------------------------------------------------- | ------------------------------------------- |
| Browser chrome | `<title>`, `<meta description>`, favicon, theme-color | Every user, every tab                       |
| Social shares  | Open Graph + Twitter Card                             | Slack, iMessage, Twitter, LinkedIn previews |
| Search engines | robots, canonical, sitemap, hreflang, JSON-LD         | Marketing routes only                       |

All three derive from one `generateMetadata` output — don't diverge by hand.

### Page-type matrix

| Route group                                                          | Indexed? | Title pattern                    | OG image          | Notes                                                                                  |
| -------------------------------------------------------------------- | -------- | -------------------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| Marketing (`/`, `/pricing`, `/docs`, blog)                           | ✅ yes   | `{Page} · Irmin`                 | Dynamic per page  | Full SEO suite.                                                                        |
| Auth (`(authentication)/*` — sign-in, sign-up, invite)               | ❌ no    | `{Page} · Irmin`                 | Static brand card | `noindex, follow`. Titles still matter for browser tabs + share previews.              |
| Console (`(console)/*` — workspace, repos, workflows, catalog, etc.) | ❌ no    | `{Entity} – {Workspace} · Irmin` | Static brand card | `noindex, nofollow`. Authenticated content. Metadata is tab-title + bookmark fidelity. |
| Error pages                                                          | ❌ no    | `Something went wrong · Irmin`   | Static brand card | Never leak error details into metadata.                                                |

### Title pattern

```
{Leaf entity} – {Workspace name} · Irmin
```

Examples:

- Workspace home: `Tim's Office · Irmin`
- Workspace list (no workspace): `Select a workspace · Irmin`
- Resource list: `Repositories – Tim's Office · Irmin`
- Resource detail: `demo-data – Tim's Office · Irmin`
- Resource subpage: `Lineage – demo-data – Tim's Office · Irmin`
- Catalog: `Catalog – Tim's Office · Irmin`
- Marketing: `Just like GitHub for Data · Irmin`

**Length limit: 60 characters** (Google truncates at ~55–60 in desktop results). If the natural pattern exceeds 60, collapse non-leaf segments to their initials — starting from the root (workspace) and working toward the leaf, one segment at a time, stopping as soon as the result fits. **The leaf entity is never truncated** — that's what users are looking for. Only when every non-leaf segment has already been collapsed and it still doesn't fit do we fall back to `{leaf} · Irmin` alone.

Examples (assuming all exceed 60 chars):

- 2 segments: `Very Long Repository Name – My Big Corporation Workspace · Irmin` → `Very Long Repository Name – M.B.C.W. · Irmin`
- 3 segments: `Lineage – Very Long Repo Name – Very Long Workspace Name · Irmin` → `Lineage – Very Long Repo Name – V.L.W.N. · Irmin` (collapse root first) → `Lineage – V.L.R.N. – V.L.W.N. · Irmin` (then the middle, if still too long)

**`title.template` participates in the same rule.** A layout that injects an entity name into `title.template` (e.g. repo, workflow) must pre-collapse that name against a reserved leaf budget so child pages don't blow past 60 chars once `%s` is resolved. Use `buildTitleTemplate(nonLeafSegments)` in `src/lib/metadata.ts` — it mirrors `buildTitle` but reserves ~20 chars for the future leaf before deciding whether to collapse. Interpolating raw entity names into a template string is a bug (the collapse logic never runs).

**Separator: `·` (U+00B7 middle dot) between site and section, `–` (en-dash) between segments within the section.** Keep consistent; mixing `|` and `—` across pages looks sloppy.

### Data-fetching rule

`generateMetadata` **must** fetch the real entity name via the same core API service the page uses. Never reconstruct from URL slug. `demo-data` → "Demo Data" is a guess; the actual name is `demo_data` or `Demo Data Copy 2` or something with punctuation the slug stripped.

Pattern:

```ts
// app/[lang]/(console)/workspace/[workspace]/repositories/[repo]/layout.tsx
import { cache } from 'react';

const fetchRepo = cache(async (workspace: string, repo: string) => {
  return core.repositoryService.fetchRepository({ workspace, slug: repo });
});

export async function generateMetadata({ params }): Promise<Metadata> {
  const { lang, workspace, repo } = await params;
  try {
    const repository = await fetchRepo(workspace, repo);
    return {
      title: `${repository.name} – ${repository.workspace_name}`,
      description: repository.description?.slice(0, 155),
    };
  } catch {
    // Fallback: slug-derived with an ellipsis signaling unloaded state.
    // Better than pretending we know the name.
    return { title: `${repo}…` };
  }
}
```

- **`React.cache()`** dedupes the fetch between `generateMetadata` and the page component, so we don't pay for it twice.
- **Fallback chain:** real data → slug with `…` suffix → generic `· Irmin`. Never a fabricated title.
- **Failures don't surface as errors** — metadata silently falls back. The page itself handles the error boundary.

### Description pattern

- **Resource pages:** the resource's actual description field, truncated at 155 chars with no trailing `…` (browsers add their own).
- **List pages:** one-line template — `"Workflows in Tim's Office"`, `"Repositories in Tim's Office"`.
- **Resource with no description:** short generic — `"{entity_type} in {workspace}"`. Do not fabricate.
- **Marketing:** copywritten per page. No generic boilerplate.
- **Never use hardcoded marketing copy on in-app routes.** "Sync, analyse & manage your data with AI in minutes" is fine on `/`; it's confusing on `/workspace/tims-office/repositories`.

**Length: 150–160 characters.** Google shows ~155 on desktop, ~120 on mobile. Front-load the important words.

### Open Graph + Twitter Card

Every page emits both — consumers read one or the other.

| Field       | OG               | Twitter               | Value                                                                                            |
| ----------- | ---------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| Site name   | `og:site_name`   | `twitter:site`        | `"Irmin"` / `@irmin_data`                                                                        |
| Title       | `og:title`       | `twitter:title`       | Same as `<title>`, drop the `· Irmin` suffix (card shows the site)                               |
| Description | `og:description` | `twitter:description` | Same as `<meta description>`                                                                     |
| Image       | `og:image`       | `twitter:image`       | Absolute URL, `1200 × 630`, JPG or PNG                                                           |
| Type        | `og:type`        | —                     | `website` for marketing/app/auth; `article` for blog posts + catalog pages with authored content |
| URL         | `og:url`         | —                     | Absolute canonical                                                                               |
| Locale      | `og:locale`      | —                     | `en_US` / `fi_FI` from URL                                                                       |
| Card        | —                | `twitter:card`        | `summary_large_image`                                                                            |

**Dynamic OG images.** `opengraph-image.tsx` per route, edge runtime, `<ImageResponse>`. Render entity name + one stat + brand. Static `opengraph-image.png` per route group as fallback.

**In-app routes** use a single static brand card. They're `noindex`, so the OG image exists only for Slack/iMessage previews — a brand card is better than leaking workspace names into arbitrary threads.

### Locale & hreflang

- `<html lang>` already driven from the `[lang]` param. ✓
- `alternates.languages` on marketing pages:

  ```ts
  alternates: {
    canonical: 'https://irmin.co/en/pricing',
    languages: {
      en: 'https://irmin.co/en/pricing',
      fi: 'https://irmin.co/fi/pricing',
    },
  }
  ```

- Metadata strings come from `dict` just like the rest of the UI. Finnish titles for `/fi/*`.

### Canonical URLs

- Every page: `alternates.canonical` pointing at the absolute URL with no query string, unless the query string is the primary identifier (rare in this app).
- Filter/pagination query params are for state, not for SEO — strip them from the canonical.
- Trailing slashes: never. Match the deployed route exactly.

### Robots & indexing

- **Marketing:** `index, follow` (default).
- **Auth routes:** `noindex, follow` — don't index sign-in, but don't break link graph from it.
- **Console routes:** `noindex, nofollow` — authenticated, no value to crawlers, prevents accidental workspace-URL indexing if a user pastes one publicly.
- **Error pages:** `noindex`.
- `robots.txt` generated from `app/robots.ts`. Disallow `/api/*`, `/en/workspace/*`, `/fi/workspace/*`, `/en/sign-in`, etc. Allow marketing + `/en/docs/*`.

### Sitemap

- `app/sitemap.ts` — dynamic. Marketing URLs only. Include every locale (`/en/pricing`, `/fi/pricing`). `changefreq` + `priority` set per section. Regenerate on build.
- Blog/docs: include every published post across every locale.
- Never include in-app routes.

### Structured data (JSON-LD)

- **Marketing homepage:** `Organization` + `WebSite` (enables site-name in Google results, sitelinks search box).
- **Blog posts:** `Article` with `headline`, `datePublished`, `author`, `image`.
- **Docs:** `TechArticle`.
- **Product / pricing page:** `Product` + `Offer` if we ever list SKUs.
- **In-app routes:** none — noindex makes it moot.

Emit as `<script type="application/ld+json">` rendered server-side in `layout.tsx` or `page.tsx`.

### Favicon, icons, theme-color

Handled via Next.js file conventions (`app/icon.{png,svg}`, `app/apple-icon.png`) + the `viewport.themeColor` export already in `app/layout.tsx`. No inline `<link rel="icon">` tags needed.

### Implementation patterns

- **`generateMetadata` over `metadata`** when the value depends on data. Static objects only for truly static routes.
- **Hoist metadata to the deepest layout that knows the entity.** Workspace layout owns workspace title. Repo layout owns repo title. Child pages use `title.template` to compose:

  ```ts
  // workspace layout
  export async function generateMetadata({ params }) {
    const workspace = await fetchWorkspace(params.workspace);
    return {
      title: {
        template: `%s – ${workspace.name} · Irmin`,
        default: `${workspace.name} · Irmin`,
      },
    };
  }

  // repo page
  export async function generateMetadata({ params }) {
    const repo = await fetchRepo(params.workspace, params.repo);
    return { title: repo.name }; // resolves to "demo-data – Tim's Office · Irmin"
  }
  ```

- **One title template per layout level.** Don't re-declare the `· Irmin` suffix at the leaf.
- **Never hand-roll `<Head>` elements.** Everything goes through the App Router `metadata` / `generateMetadata` / `viewport` exports so Next.js can stream them correctly.

### Before shipping a new route

- [ ] `generateMetadata` fetches the real entity name (not slug-derived).
- [ ] `React.cache()` used to dedupe with the page's data fetch.
- [ ] Title ≤ 60 chars, description ≤ 160 chars.
- [ ] Fallback handles fetch failure without throwing.
- [ ] `alternates.canonical` set.
- [ ] `alternates.languages` set (marketing only).
- [ ] `robots` reflects the route's indexing policy.
- [ ] Dynamic OG image renders correctly (Next.js devtools → Open Graph tab).
- [ ] Title visible in browser tab matches expected pattern (not slug-reconstructed).
- [ ] Localized strings in both `en.ts` and `fi.ts`.

## Anti-patterns

Reject in review. One grep-able list of patterns that keep coming up.

### HTML / semantics

- `<div onClick>` / `<span onClick>` — use `<button>` or `<a>`.
- `<button onClick={router.push}>` for navigation — use `<Link>`.
- `<Link><button>` nested — invalid interactive nesting.
- `<a href="javascript:…">` — use `<button>`.
- Missing `alt` on `<img>` / `<Image>` (empty `alt=""` is fine; missing is not).
- Missing `width` / `height` on images.
- Heading-level skips (`<h1>` → `<h3>`).
- `user-scalable=no` or `maximum-scale=1` in viewport meta.

### ARIA

- `role="listbox"` wrapping non-option children.
- `aria-controls` pointing at an id not in the DOM.
- `role="dialog"` + `aria-modal` without focus trap + Escape + focus return.
- Icon-only button without `aria-label`.
- Decorative icon adjacent to text label without `aria-hidden="true"`.

### Focus / keyboard

- `outline: none` / `outline-none` without visible focus replacement.
- `focus:` (bare) when `focus-visible:` was intended.
- `tabIndex={0}` on natively-focusable elements.
- `autoFocus` on mobile or on non-primary inputs.

### Forms

- Placeholder as the only label.
- `onPaste` + `preventDefault`.
- Submit disabled before the user interacts.
- `spellCheck` left on for emails / codes / tokens.

### Motion

- `transition: all` / `transition-all`.
- Animating layout properties (`width`, `top`, `left`, `margin`) — prefer `transform`.
- `opacity-10` (or near-invisible) on a skeleton.
- Per-component overrides of `prefers-reduced-motion`.

### Styling

- Raw Tailwind grays (`bg-gray-*`, `text-gray-*`, `border-gray-*`, `dark:*-gray-*`). Use semantic tokens.
- Hardcoded hex colors in components. Use theme tokens.
- Font families other than Geist Sans / Geist Mono / Lora.
- `!important` to override Tailwind.

### Performance

- `.map()` over >50 items without virtualization.
- Reading layout in render (`getBoundingClientRect`, `offsetHeight`, `scrollTop`).
- Controlled `<input>` that re-renders a large tree every keystroke. Debounce or uncontrolled.
- Non-critical fonts without `preload: false`.

### Copy

- Hardcoded English `aria-label` / `title` / error string. Everything through `dict`.
- Three dots `...` instead of `…`.
- Straight quotes in prose.
- Generic titles ("Something went wrong") when a specific one is knowable.
- Hardcoded date/number formats. Use `Intl.*`.

### Next.js

- Hand-rolled `<Head>` elements. Use `metadata` / `generateMetadata` / `viewport`.
- `themeColor` on the `metadata` export — Next 16 silently drops it. Use `viewport`.
- `generateMetadata` reconstructing titles from URL slugs. Fetch the real entity name with `React.cache()`.
