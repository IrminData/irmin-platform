# Permissions

Policy-based access control (RBAC) system for Irmin with LRU caching and batch permission checks.

## Overview

The `permissions` package provides a centralized, high-performance permission checking system for the Irmin API. It implements a flexible policy-based access control model with support for user-specific, role-based, and organization-wide policies.

## Features

- **Policy-Based Access Control**: Fine-grained permissions using resources, actions, and effects
- **Resource Specificity Precedence**: Specific resource policies override generic policies
- **LRU Cache with TTL**: High-performance in-memory caching with automatic expiration
- **Batch Permission Checks**: Efficiently filter large collections based on permissions
- **Owner Bypass**: Workspace owners automatically have full access
- **Thread-Safe**: All operations are safe for concurrent use

## Architecture

### Core Components

1. **Service** (`service.go`)
   - Main permission checking service
   - Handles owner checks and policy evaluation
   - Manages permission cache

2. **Cache** (`cache.go`)
   - LRU cache with TTL for permission results
   - Automatic cleanup of expired entries
   - Configurable cache size and TTL

3. **Filter** (`filter.go`)
   - Batch permission checking for collections
   - Optimized to minimize database queries
   - Supports generic type filtering

## Usage

### Basic Permission Check

```go
import "irmin-api/permissions"

// Create service
permissionService := permissions.NewService(database, logger)

// Check permission
allowed, err := permissionService.IsAllowed(
    user,
    workspace,
    db.PolicyResourceRepository,
    &repositoryID,
    db.PolicyActionRead,
)
if err != nil {
    return err
}
if !allowed {
    return ErrAccessDenied
}
```

### Batch Permission Filtering

```go
// Filter workflows based on permissions
filteredWorkflows, err := permissions.IsAllowedFilter(
    permissionService,
    user,
    workspace,
    db.PolicyResourceWorkflow,
    db.PolicyActionRead,
    workflows,
    func(w db.Workflow) uint { return w.ID },
)
```

## Policy Evaluation

### Precedence Rules

Permission evaluation follows a strict precedence hierarchy:

1. **Workspace Ownership**: Owners always have full access
2. **Role Ownership**: Users with owner roles have full access
3. **Resource Specificity**: Specific resource policies override generic policies
4. **Policy Effect**: Within the same specificity level:
   - Specific Allow > Generic Deny
   - Specific Deny > Generic Allow
5. **Default Deny**: If no policies match, access is denied

### Policy Components

- **Resource**: The type of resource (Repository, Workflow, Connection, etc.)
- **Resource ID**: Optional specific resource identifier
- **Action**: The operation (Read, Create, Update, Delete)
- **Effect**: Allow or Deny
- **Principal**: Who the policy applies to (User, Role, Everyone)

### Example Policy Scenarios

**Scenario 1**: Specific Allow overrides Generic Deny
```
Generic Policy: Deny Everyone Read Workflow
Specific Policy: Allow User Read Workflow #123
Result: User can read Workflow #123 but not others
```

**Scenario 2**: Specific Deny blocks access
```
Generic Policy: Allow Role:Editor Read Repository
Specific Policy: Deny User Read Repository #456
Result: User cannot read Repository #456 despite editor role
```

## Cache Configuration

### Default Settings

```go
const (
    DefaultCacheSize            = 10000              // Max entries
    OwnerPermissionCacheTTL     = 10 * time.Minute  // Owner checks
    DefaultPermissionCacheTTL   = 5 * time.Minute   // Regular checks
    CleanupInterval             = 1 * time.Minute    // Cleanup frequency
)
```

### Cache Operations

```go
// Clear expired entries
permissionService.ClearPermissionCache()

// Set custom TTL for specific permission
permissionService.SetPermissionCacheTTL(
    userID,
    workspaceID,
    resource,
    resourceID,
    action,
    allowed,
    customTTL,
)

// Get cache statistics
stats := permissionService.cache.GetStats()
fmt.Printf("Cache size: %d/%d\n", stats.Size, stats.MaxSize)
```

## Integration with Engine

The permissions package integrates with the data engine through the `PermissionChecker` interface:

```go
// In engine/engine.go
type PermissionChecker interface {
    IsAllowed(
        user *db.User,
        workspace *db.Workspace,
        resource db.PolicyResource,
        resourceID *uint,
        action db.PolicyAction,
    ) (bool, error)
}

// Set permission checker
dataEngine.SetPermissionChecker(permissionService)
```

This allows the engine to perform permission checks during SQL query execution.

## Testing

The package includes comprehensive tests for:

- Permission checking with different roles
- Resource specificity precedence
- Cache hit/miss behavior
- Cache expiration
- Batch filtering with various scenarios

Run tests:
```bash
go test ./permissions/... -v
```
