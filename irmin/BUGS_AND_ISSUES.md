# Irmin Core API - Bugs and Issues Report

## Critical Issues (High Priority, High Impact)

### 1. **Race Condition in Orchestrator Event Handling**
**Location**: `orchestrator/orchestrator.go:111-142`
**Severity**: Critical
**Ease of Resolution**: Medium

**Issue**: The orchestrator creates new background contexts for each event without proper cancellation, leading to potential resource leaks and race conditions:
```go
// Creates contexts that are never canceled
dispatchedCtx := context.Background()
lakefsCtx := context.Background()
workerCtx := context.Background()
```

**Impact**: Memory leaks, goroutine leaks, potential deadlocks
**Solution**: Use context.WithCancel() and properly cancel contexts when done

### 2. **Missing Connection Pool Validation in Database Layer**
**Location**: `db/db.go:42-50`
**Severity**: Critical
**Ease of Resolution**: Easy

**Issue**: Database connection pool creation doesn't validate configuration parameters:
```go
pool, newPoolErr := pgxpool.NewWithConfig(context.Background(), poolConfig)
if newPoolErr != nil {
    return nil, fmt.Errorf("failed to create pgx connection pool: %w", newPoolErr)
}
```

**Impact**: Silent failures, connection exhaustion, performance degradation
**Solution**: Add connection pool configuration validation

### 3. **Unsafe JWT Algorithm Validation**
**Location**: `utils/validateJWT.go:21-23`
**Severity**: Critical
**Ease of Resolution**: Easy

**Issue**: JWT validation only checks algorithm string equality, vulnerable to algorithm confusion attacks:
```go
if token.Method.Alg() != signingAlg {
    return nil, fmt.Errorf("unexpected signing algorithm: %v, expected: %s", token.Header["alg"], signingAlg)
}
```

**Impact**: Authentication bypass, security vulnerabilities
**Solution**: Implement proper algorithm validation with a whitelist

### 4. **Database Connection Leaks in Notification System**
**Location**: `db/db.go:74-88`
**Severity**: Critical
**Ease of Resolution**: Medium

**Issue**: Database connections for notifications are not properly released in error cases:
```go
func (d *Database) ListenForNotifications(ctx context.Context, channel string) (func() error, error) {
    conn, getConnErr := d.GetPgxConn(ctx)
    if getConnErr != nil {
        return nil, fmt.Errorf("failed to get connection for notifications: %w", getConnErr)
    }
    // Connection not released on error
}
```

**Impact**: Connection pool exhaustion, database deadlocks
**Solution**: Add proper defer statements and error handling

## High Priority Issues

### 5. **Inconsistent Error Handling in Workflow Execution**
**Location**: `orchestrator/executeWorkflow.go:23-54`
**Severity**: High
**Ease of Resolution**: Medium

**Issue**: Workflow execution has inconsistent error handling and potential goroutine leaks:
```go
go func() {
    if err := o.listenForStatusChanges(ctx, o.db, run.ID, statusChan); err != nil {
        o.logger.Error("failed to listen for status changes", "error", err)
        // Error is logged but not propagated
    }
}()
```

**Impact**: Silent failures, resource leaks, difficult debugging
**Solution**: Implement proper error propagation and resource cleanup

### 6. **SQL Injection Risk in Search Functionality**
**Location**: `db/search.go:600-677`
**Severity**: High
**Ease of Resolution**: Medium

**Issue**: Search functionality builds SQL queries with user input, potential SQL injection:
```go
func (d *Database) buildFieldSearchConditionParameterized(
    tableName, fieldName string,
    token SearchToken,
) (string, []any) {
    // Field references built from user input
    fieldRef := d.buildFieldReference(fieldName, tableName)
}
```

**Impact**: Data breach, unauthorized access
**Solution**: Implement proper parameterized queries and input validation

### 7. **Memory Leak in Permission Cache**
**Location**: `lib/isAllowed.go:70-95`
**Severity**: High
**Ease of Resolution**: Easy

**Issue**: Permission cache cleanup is inefficient and can lead to memory leaks:
```go
// Lazy cleanup - clean every 100 operations
if pc.cleanups%100 == 0 {
    pc.cleanExpiredEntriesUnsafe()
}
```

**Impact**: Memory exhaustion, performance degradation
**Solution**: Implement proper LRU cache with TTL

### 8. **Panic in Locale Manager**
**Location**: `locales/locales.go:50`
**Severity**: High
**Ease of Resolution**: Easy

**Issue**: Locale manager panics on initialization failure:
```go
panic("failed to initialize locale manager: " + err.Error())
```

**Impact**: Application crashes, poor user experience
**Solution**: Return error instead of panic

## Medium Priority Issues

### 9. **Resource Leaks in HTTP Client Usage**
**Location**: `lib/inviteNotifications.go:279`
**Severity**: Medium
**Ease of Resolution**: Easy

**Issue**: HTTP response bodies are not consistently closed:
```go
defer resp.Body.Close()
```

**Impact**: Resource leaks, connection exhaustion
**Solution**: Audit all HTTP calls and ensure proper resource cleanup

### 10. **Insecure Environment Variable Handling**
**Location**: `utils/loadEnvs.go:89-95`
**Severity**: Medium
**Ease of Resolution**: Easy

**Issue**: Environment variables are set with default values that could be insecure:
```go
token, err := getEnv("TOKEN", false, "token-undefined")
```

**Impact**: Weak default security, potential unauthorized access
**Solution**: Require secure values for sensitive environment variables

### 11. **Missing Input Validation in Controllers**
**Location**: `controllers/workflows.go:183-200`
**Severity**: Medium
**Ease of Resolution**: Easy

**Issue**: Controllers don't validate input size limits:
```go
// Parse and validate the JSON request body
var req irmincore.UpdateWorkflowRequest
if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
    return validationErr
}
```

**Impact**: DoS attacks, resource exhaustion
**Solution**: Add request size limits and input validation

### 12. **Inefficient Database Queries in Search**
**Location**: `db/search.go:1222-1282`
**Severity**: Medium
**Ease of Resolution**: Medium

**Issue**: Search queries are not optimized and can cause performance issues:
```go
// Multiple individual queries instead of batch operations
for _, t := range triggers {
    if err := o.processTimeTrigger(ctx, tx, &t); err != nil {
        // Continue processing other triggers
    }
}
```

**Impact**: Poor performance, database load
**Solution**: Implement batch operations and query optimization

### 13. **Missing Transaction Rollback in Error Cases**
**Location**: `controllers/workflows.go:211-275`
**Severity**: Medium
**Ease of Resolution**: Easy

**Issue**: Database transactions don't have proper rollback handling:
```go
txErr := api.DB.Transaction(func(tx *gorm.DB) error {
    // Multiple operations without proper error handling
    return nil
})
```

**Impact**: Data inconsistency, partial updates
**Solution**: Add proper transaction rollback and error handling

## Low Priority Issues

### 14. **TODO Comments Indicating Incomplete Features**
**Location**: `controllers/workspaces.go:339`, `controllers/connections.go:265`
**Severity**: Low
**Ease of Resolution**: Easy

**Issue**: Multiple TODO comments indicate incomplete functionality:
```go
// TODO: Delete all related data (repositories, etc.)
// TODO: Verify that the connection is not used in any workflows
```

**Impact**: Incomplete features, potential data orphaning
**Solution**: Complete the TODO items or remove if not needed

### 15. **Hardcoded Configuration Values**
**Location**: `main.go:33-37`
**Severity**: Low
**Ease of Resolution**: Easy

**Issue**: Configuration values are hardcoded:
```go
const (
    MaxRequestBodySize = 5 * 1024 * 1024 * 1024 // 5 GB
    CacheExpirationDuration = 5 * time.Minute
)
```

**Impact**: Inflexible configuration, difficult tuning
**Solution**: Move to environment variables or configuration files

### 16. **Excessive Logging in Production**
**Location**: `main.go:180`, `orchestrator/dispatcher.go:189`
**Severity**: Low
**Ease of Resolution**: Easy

**Issue**: Debug logging in production code:
```go
log.Println("Allowed origins:", allowedOrigins)
o.logger.DebugContext(ctx, "job already claimed by another dispatcher")
```

**Impact**: Log spam, potential information leakage
**Solution**: Use appropriate log levels and conditional logging

### 17. **Missing Metrics and Monitoring**
**Location**: Throughout codebase
**Severity**: Low
**Ease of Resolution**: Medium

**Issue**: No metrics collection for key operations
**Impact**: Difficult to monitor application health
**Solution**: Add metrics collection for key operations

## Performance Issues

### 18. **Inefficient Cache Implementation**
**Location**: `lib/isAllowed.go:85-105`
**Severity**: Medium
**Ease of Resolution**: Medium

**Issue**: Cache cleanup is inefficient:
```go
// Simple approach: remove half the entries when we hit the limit
for key := range pc.cache {
    if count >= targetSize {
        break
    }
    delete(pc.cache, key)
    count++
}
```

**Impact**: Poor cache performance, memory spikes
**Solution**: Implement proper LRU cache

### 19. **Blocking Operations in Main Thread**
**Location**: `main.go:208-213`
**Severity**: Medium
**Ease of Resolution**: Easy

**Issue**: Orchestrator starts in main thread:
```go
go func() {
    if orchestratorStartErr := orchestrator.StartOrchestrator(context.Background()); orchestratorStartErr != nil {
        log.Printf("Orchestrator error: %v", err)
    }
}()
```

**Impact**: Application startup delays
**Solution**: Proper goroutine management and error handling

## Security Issues

### 20. **Missing Rate Limiting**
**Location**: Route handlers throughout `routes/routes.go`
**Severity**: Medium
**Ease of Resolution**: Medium

**Issue**: No rate limiting on API endpoints
**Impact**: DoS attacks, resource exhaustion
**Solution**: Implement rate limiting middleware

### 21. **Insufficient Input Sanitization**
**Location**: `db/search.go:400-450`
**Severity**: Medium
**Ease of Resolution**: Easy

**Issue**: Search inputs are not properly sanitized:
```go
// SECURITY: Validate query length to prevent abuse
if len(query) > MaxSearchQueryLength {
    query = query[:MaxSearchQueryLength]
}
```

**Impact**: XSS attacks, injection vulnerabilities
**Solution**: Implement comprehensive input sanitization

## Recommendations for Resolution Priority

1. **Immediate (Critical)**: Fix JWT validation, database connection leaks, and race conditions
2. **This Week (High)**: Address error handling, SQL injection risks, and memory leaks
3. **This Month (Medium)**: Improve performance, add input validation, and fix transaction handling
4. **Long-term (Low)**: Complete TODO items, add metrics, and improve configuration management

## Additional Suggestions

1. **Add comprehensive unit tests** for all critical paths
2. **Implement health checks** for all external dependencies
3. **Add circuit breakers** for external service calls
4. **Implement distributed tracing** for better observability
5. **Add automated security scanning** to CI/CD pipeline
6. **Implement graceful shutdown** for all services
7. **Add configuration validation** at startup
8. **Implement proper logging structure** with correlation IDs