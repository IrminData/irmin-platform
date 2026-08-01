# AGENTS.md

This file provides guidance to coding agents (Claude Code, Gemini CLI, etc.) when working with code in this repository. `CLAUDE.md` and `GEMINI.md` are symlinks to this file.

## Development Commands

```bash
pnpm install                     # Install dependencies (Node.js 24+, pnpm 10.24.0+)
pnpm dev                         # Start dev server with HTTPS and Turbopack
pnpm validate                    # TypeScript check + lint + format with auto-fix
pnpm build                       # Production build (includes TypeDoc generation)
pnpm e2e                         # Run Playwright E2E tests
pnpm e2e:ui                      # Run tests with interactive UI
```

## Architecture Overview

This is a Next.js 16 + React 19 application serving as the primary UI for the Irmin data platform. It uses the App Router with file-based routing under `src/app/[lang]/`.

### Three-Layer Data Architecture

```
Components (UI) → Custom Hooks (useXxx) → TanStack Query → API Services (IrminCore)
```

All data flows through this pattern. Components call hooks, hooks use TanStack Query for caching, and queries call service methods on `IrminCore`.

### Key Directories

- `src/lib/core/` - `IrminCore` class and 24 service classes (RepositoryService, WorkflowService, etc.)
- `src/hooks/api/` - Custom hooks wrapping TanStack Query (useRepositories, useWorkspace, etc.)
- `src/hooks/api/mutations/` - Reusable mutation handlers with optimistic updates
- `src/context/` - React contexts (IAMContext, LocaleContext, PopupContext, WorkspaceContext, etc.)
- `src/types/core/` - TypeScript types for API responses
- `src/components/ui/` - Base Radix UI components (52 components)

### IrminCore API Client

The `IrminCore` class (`src/lib/core/IrminCore.ts`) is the central API client:

```typescript
const core = new IrminCore(locale, token);
const repos = await core.repositoryService.fetchRepositories({ workspace });
```

Each service wraps related endpoints. Services are initialized via composition in IrminCore.

### Query Keys

Centralized in `src/lib/queryKeys.ts`. Use these for cache management:

```typescript
repositoriesQueryKey(workspace); // ['repositories', workspace]
repositoryQueryKey(workspace, slug); // ['repository', workspace, slug]
workflowRunsQueryKey(workspace, id, page); // ['workflow-runs', ...]
```

### Mutation Helpers

Located in `src/hooks/api/mutations/utils.ts`. Provides reusable handlers for optimistic updates:

- `createMutationHandlers` - Optimistic list additions
- `updateMutationHandlers` - Updates in both list and single-item caches
- `deleteMutationHandlers` - Removes from caches

Temp IDs for optimistic creates use format: `temp-{type}-{timestamp}-{random}` (see `src/utils/generateTempId.ts`)

### Context Providers

Provider nesting order in `src/app/layout.tsx`:

```
PostHogProvider → ClerkProvider → ReactQueryProvider → LocaleProvider → PopupProvider → IAMProvider → IrminCoreProvider → ThemeProvider
```

Key contexts:

- `IAMContext` - Authentication, `getToken()`, user profile, `authError` (surfaced via context so the error UI can render at the right level — see Error Handling below)
- `WorkspaceContext` - Current workspace data and hooks
- `PopupContext` - `irminAlert()`, `irminConfirm()`, `irminModal()`
- `LocaleContext` - Internationalization, `locale`, `dict`
- `IrminCoreContext` - Factory for the `IrminCore` API client with current locale + token

### Routing Structure

```
/[lang]/workspace/[workspace]/
  /repositories          - Repository browser
  /workflows             - Workflow management
  /connectors            - Data source connectors
  /queries               - SQL query editor
  /ai-applications       - AI app management
  /assistant             - AI chat interface
  /settings              - Workspace admin
```

Route groups: `(console)` for main app, `(authentication)` for auth pages.

## Code Patterns

### Adding a New API Hook

1. Add query key to `src/lib/queryKeys.ts`
2. Create hook in `src/hooks/api/useXxx.tsx`
3. Use `IrminCore` service methods for API calls
4. Use mutation helpers for create/update/delete operations

### Component Organization

- Feature-based folders in `src/components/` (repository, workflow, connection, etc.)
- Server components for layouts, client components (`'use client'`) for interactive UI
- UI primitives in `src/components/ui/` wrap Radix UI with CVA variants

### Error Handling

- API errors parsed in `IrminCore.fetchAPI()`
- Mutation errors handled in hooks with `onError` callback
- User-facing errors shown via `PopupContext.irminAlert()`
- **Auth/profile errors** (`IAMContext.authError`) are rendered by `AuthenticationErrorHandler`, which is mounted **inside** `ConsoleWrapper` around the `<main>` element only — NOT at the provider level. This keeps the sidebar, nav, search, workspace switcher and theme toggle usable when a profile fetch fails. If you add a new authenticated route outside the `(console)` group, mount `AuthenticationErrorHandler` explicitly in that layout.

### Styling & Design Tokens

**`DESIGN.md` is the non-negotiable design system for this repo.** It lives at the repo root (`./DESIGN.md`). Every visual or UX change must follow it — tokens, typography scale, motion rules, accessibility, forms, images, content/copy, error-state flow, skeleton guidance, SEO, anti-patterns. Ad-hoc patterns that ignore it get rejected in review.

- **Design system source of truth**: `DESIGN.md` (Industrial/Utilitarian, HSL 197 Irmin Blue + HSL 137 Irmin Green, Geist Sans + Geist Mono + Lora).
- **Token layer**: `src/styles/theme.css` — CSS variables for both light and dark mode, exposed to Tailwind v4 via `@theme inline`
- **Typography primitive**: `src/components/ui/display-title.tsx` for page titles (defaults to Geist Sans bold; pass `brand` prop for Big Shoulders on marketing surfaces). Always use this instead of inlining `<h1 className="text-3xl font-bold">`
- **Color rules**:
  - Use semantic tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`, `bg-card`, `text-accent`) — NOT `text-gray-*`, `bg-gray-*`, `dark:border-gray-800` etc. The token system defines blue-tinted neutrals for dark mode; raw grays break the palette.
  - `text-accent` is Irmin Green — reserve for brand-forward moments (active states, primary CTAs), not as a default label color
- **Motion**: Keep transitions at `duration-150` (short) per DESIGN.md. Never `transition-all` / `transition` shorthand — list properties explicitly (`transition-[color,background-color]`)
- **Icons**: Decorative icons adjacent to a text label need `aria-hidden='true'`. Icon-only buttons need `aria-label`
- **Skeletons**: When you change a component's container, columns, row count, header layout, or buttons, update its paired skeleton in the same commit — either the `*Skeleton.tsx` next to the component in `src/components/ui/loading/` or the nearest `loading.tsx` under `src/app/`. A skeleton that doesn't match causes a layout shift on data arrival. See DESIGN.md → "Loading & Skeleton States" → "Keep skeletons in lockstep with the real component" for the common drift patterns to watch for.

## TypeDoc Requirements

All exported functions must have TypeDoc comments. Run `pnpm docs` before PRs - it must complete without errors or warnings. Documentation served at `/tsdocs` (password protected).

## Testing

E2E tests use Playwright. Test user credentials configured via environment variables (TEST_USER_EMAIL, TEST_USER_PASSWORD, etc. in .env).

```bash
pnpm e2e:codegen          # Record new tests for desktop
pnpm e2e:codegen-mobile   # Record new tests for mobile
```

## Translation System

### Dictionary Files

- `src/lib/dict/en.ts` - English (source of truth for TypeScript types)
- `src/lib/dict/fi.ts` - Finnish

The `Dictionary` type is inferred from `en.ts`, ensuring type safety. Access translations via the `useLocale()` hook from `LocaleContext`.

### Validation Commands

```bash
pnpm dict:validate        # Check for parity issues, unused keys, duplicates
pnpm dict:fix             # Auto-fix missing translations in fi.ts
```

### Adding Translations

1. Add new keys to `en.ts` first
2. Run `pnpm dict:fix` to sync structure to `fi.ts`
3. Replace `[TODO: Translate]` markers with Finnish translations
4. Run `pnpm dict:validate` to verify

### Best Practices

- Use `common.*` for reusable strings (e.g., `common.loading`, `common.save`)
- Avoid duplicating values across modules
- Always access dict via `useLocale()` hook: `const { dict } = useLocale();`
- Never use optional chaining (`dict?.key`) - dict is always defined
- Never use fallback patterns (`dict.key ?? 'fallback'`) for existing keys

## Handoff

Before handing off work — finishing a task, opening a PR, or passing to another agent — run the `document-release` skill to reconcile docs (README, ARCHITECTURE, CONTRIBUTING, this AGENTS.md) with what actually shipped. This is required, not optional: it prevents doc drift and ensures the next agent picks up accurate context.
