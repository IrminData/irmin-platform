# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Irmin Console is the main web application for the Irmin data platform - a Next.js 15 application providing a comprehensive data management interface with repository browsing, query execution, and workflow orchestration capabilities.

## Architecture

### Core Stack

- **Next.js 15** with App Router and React 19
- **TypeScript** with strict configuration
- **Tailwind CSS v4** with custom design tokens
- **Radix UI** for accessible component primitives
- **TanStack Query v5** for server state management
- **Clerk** for authentication and user management

### Key Architecture Patterns

- **Service Layer**: Centralized API client (`IrminCore`) with domain-specific services
- **Context-Driven**: Multiple layered providers for global state management
- **Custom Hooks**: Domain-specific hooks for data fetching and state management
- **Route Groups**: Organized routing with `(authentication)` and `(console)` groups
- **Internationalization**: URL-based locale routing with `[lang]` parameter

### Directory Structure

```
src/
├── app/                     # Next.js App Router pages
│   ├── [lang]/             # Internationalized routes
│   │   ├── (authentication)/ # Auth-related pages
│   │   └── (console)/      # Main application routes
├── components/             # Reusable UI components
│   ├── ui/                 # Base UI components
│   ├── [feature]/          # Feature-specific components
├── context/                # React context providers
├── hooks/                  # Custom hooks for data fetching
├── lib/                    # Utility functions and configurations
├── types/                  # TypeScript type definitions
└── utils/                  # Helper functions
```

## Development Commands

### Dependencies

```bash
# Install dependencies (requires Node.js 22+, pnpm 10.12.1+)
pnpm install
```

### Development

```bash
# Start development server with HTTPS and Turbopack
pnpm dev

# Build for production (includes TypeDoc documentation generation)
pnpm build

# Start production server
pnpm start
```

### Code Quality

```bash
# Linting
pnpm lint
pnpm lint:fix

# Code formatting
pnpm format
pnpm format:fix

# Generate TypeDoc documentation
pnpm docs
```

### Testing

```bash
# Run end-to-end tests
pnpm e2e

# Run tests with UI
pnpm e2e:ui

# Show test report
pnpm e2e:report

# Generate test code for desktop
pnpm e2e:codegen

# Generate test code for mobile
pnpm e2e:codegen-mobile
```

## Development Guidelines

### Code Quality Standards

- Use ESLint with Next.js and TypeScript strict rules
- Document all exported functions with TypeDoc comments
- Follow React best practices with hooks and functional components
- Use Prettier for consistent formatting
- All E2E tests must pass before deployment

### Component Development

- Use Radix UI primitives for accessible components
- Follow the compound component pattern for complex UI elements
- Create layout wrappers for consistent page structure
- Use TypeScript for all component props and state

### State Management

- Use TanStack Query for server state with standardized query keys
- Implement React Context for cross-cutting concerns
- Use React Hook Form for form state management
- Follow the custom hook pattern for domain-specific logic

### API Integration

- Use the centralized `IrminCore` client for all API calls
- Implement service classes for each domain (connections, repositories, etc.)
- Handle authentication tokens automatically via Clerk integration
- Include Accept-Language headers for localized responses

## Key Features

### Authentication & Authorization

- Clerk integration for user management
- Role-based access control at workspace level
- Dynamic authentication provider loading

### Data Management

- Git-like repository structure with branches, commits, and tags
- Visual diff viewers for data changes
- Object upload and management with schema validation
- Query execution with results visualization

### Workflow Orchestration

- Visual pipeline editor for workflow creation
- Scheduled and event-driven workflow execution
- Connector-based data integrations
- Real-time workflow run monitoring

### Internationalization

- URL-based locale detection (`/en/`, `/fi/`)
- Cookie-based locale persistence
- Typed dictionary system with compile-time safety
- Fallback to browser language preferences

## Testing Strategy

### End-to-End Testing

- Playwright for comprehensive E2E testing
- Pre-configured test user authentication
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile viewport testing capabilities

### Test Environment Setup

- Requires test user credentials in environment variables
- Uses authentication state persistence for faster test execution
- Includes CI/CD integration with retry logic

## Environment Configuration

### Required Environment Variables

```bash
# Core application settings
NEXT_PUBLIC_BASE_URL=https://console.irmin.dev
NEXT_PUBLIC_API_URL=https://api.irmin.dev/api
NODE_ENV=development

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret

# Monitoring and analytics
NEXT_PUBLIC_SENTRY_DSN=https://ingest.sentry.io/xxxxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx

# Testing
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password
TEST_USER_WORKSPACE=workspace_name
```

## Deployment Notes

### Build Process

- TypeDoc documentation is generated during build
- Sentry source maps are uploaded automatically
- Standalone output for containerized deployment

### Performance Monitoring

- Vercel Speed Insights integration
- Sentry performance monitoring
- PostHog analytics for user behavior

### Development Features

- Local HTTPS development with custom certificates
- Hot module replacement with Turbopack
- Environment-based access control for staging
- Automatic TypeDoc documentation serving at `/tsdocs`
