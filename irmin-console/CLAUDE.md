# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Provider nesting order in root layout:

```
PostHogProvider → ClerkProvider → ReactQueryProvider → LocaleProvider → IAMProvider → PopupProvider → ThemeProvider
```

Key contexts:

- `IAMContext` - Authentication, `getToken()`, user profile
- `WorkspaceContext` - Current workspace data and hooks
- `PopupContext` - `irminAlert()`, `irminConfirm()`, `irminModal()`
- `LocaleContext` - Internationalization, `locale`, `dict`

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

## TypeDoc Requirements

All exported functions must have TypeDoc comments. Run `pnpm docs` before PRs - it must complete without errors or warnings. Documentation served at `/tsdocs` (password protected).

## Testing

E2E tests use Playwright. Test user credentials configured via environment variables (TEST_USER_EMAIL, TEST_USER_PASSWORD, etc. in .env).

```bash
pnpm e2e:codegen          # Record new tests for desktop
pnpm e2e:codegen-mobile   # Record new tests for mobile
```
