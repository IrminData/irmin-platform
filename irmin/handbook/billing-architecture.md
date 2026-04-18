# Billing

Billing is an optional feature that integrates with [Polar.sh](https://polar.sh) for subscription management, checkout sessions, and usage-based metering. When disabled (`BILLING_ENABLED=false`), all billing endpoints return 404 and usage tracking is skipped.

## Architecture

```
Console (Next.js)  ──►  Core API (Go/Fiber)  ──►  Polar.sh API
                              ▲
                              │
                        Polar Webhooks
```

- **Core API** acts as the intermediary between the console and Polar
- **Polar webhooks** notify the Core API of subscription changes (created, updated, cancelled)
- **Usage tracking** records workspace activity locally, then reports to Polar in batches

### Key Components

| Component     | Path                     | Description                                                                                       |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| Controllers   | `controllers/billing.go` | HTTP handlers for subscription, usage, checkout, portal, and webhook endpoints                    |
| Service       | `services/billing.go`    | Polar API client, plan resolution, webhook event handling, seat limit checks                      |
| Usage Tracker | `services/usage.go`      | Background goroutine that batches usage events and reports to Polar                               |
| Middleware    | `middlewares/billing.go` | Feature gate, usage limit enforcement, webhook signature verification                             |
| DB Models     | `db/billing.go`          | GORM models for subscriptions, usage records, usage summaries, billing events                     |
| Routes        | `routes/routes.go`       | Billing endpoints under `/workspaces/{workspace}/billing/`\*, webhook at `/api/v1/webhooks/polar` |

## Billing Model

There is a **single usage-based plan** — no tiers. Every workspace starts free with usage-based limits. Adding a payment method (via Polar checkout) unlocks unlimited usage with pay-as-you-go billing.

### 8 Meters

| Meter                 | Rate              | Unit        | Free Limit          |
| --------------------- | ----------------- | ----------- | ------------------- |
| Storage               | 0.02 €/GB         | GB          | 5 GB                |
| Workflow Runs         | 0.01 €/run        | runs        | 200 runs            |
| AI Requests           | 0.05 €/req        | requests    | 40 requests         |
| API Requests          | 0.0005 €/req      | requests    | 4,000 requests      |
| Data Transfer         | 0.05 €/GB         | GB          | 40 GB               |
| Seats                 | 5 €/seat          | seats       | 0 extra seats       |
| Compute Invocations   | 0.01 €/invocation | invocations | 100 invocations     |
| Vectorizations        | 0.001 €/document  | documents   | 1,000 documents     |

### Free Credit

Each meter gets **2€ free credit per month** (16€ total) for display purposes. However, free tier hard limits are set explicitly per dimension (not derived from credit/rate) — see `db/billing.go` constants.

### Hard Limits

Hard limits are enforced only for users **without a payment method on file**. Users with a payment method have unlimited usage with pay-as-you-go billing.

Limits are defined in `db.GetFreeTierHardLimits()` — explicit per-dimension constants in `db/billing.go`.

#### Enforcement by Dimension

| Dimension             | Enforcement           | Location                                              | Notes                                                                                                                                                            |
| --------------------- | --------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow Runs         | Hard limit            | `lib.CreateWorkflowRun()`                             | Covers all 7 creation paths (manual API, time triggers, repo events, connection events, workflow run events, pipeline stages, MCP) via `UsageCheckFunc` callback |
| Seats                 | Hard limit            | Invite flow (`CheckSeatLimit()`)                      | Checked when inviting new members                                                                                                                                |
| Compute Invocations   | Hard limit            | Orchestrator + `UsageLimitMiddleware` on script route | Checked before each sandbox `ExecutedStoredScript` call in action/pipeline stages and on the manual script execute API endpoint                                  |
| Vectorizations        | Hard limit            | Orchestrator pipeline vectorize stage                 | Checked before `handleEmbeddingsVectorize` in pipeline stages                                                                                                    |
| Storage               | No hard limit         | —                                                     | Includes metadata, LakeFS data, workflow-generated data — not just user uploads                                                                                  |
| API Requests          | No hard limit         | —                                                     | Adding a DB query per request is too expensive                                                                                                                   |
| Data Transfer         | No hard limit         | —                                                     | Same concern as API requests                                                                                                                                     |
| AI Requests           | Tracked by `irmin-ai` | AI service                                            | Out of scope for core API                                                                                                                                        |

### Seats

Seats are a gauge meter tracking extra workspace members. The first member is free. Free users (no payment method) are limited to 1 member. Subscribers can add unlimited members at 5€/seat/month.

### Data Flow

**Checkout (adding a payment method):**

1. Console calls `POST /billing/checkout` with return URL
2. Core API creates/retrieves a Polar customer (mapped to workspace SQID)
3. Core API saves the Polar customer ID to `workspace_subscriptions`
4. Core API creates a Polar checkout session and returns the URL
5. Console redirects the user to Polar's hosted checkout
6. After payment, Polar sends a `subscription.created` webhook

**Webhook Processing:**

1. Polar sends POST to `/api/v1/webhooks/polar`
2. Middleware verifies the Standard Webhooks signature (HMAC-SHA256)
3. Middleware checks idempotency (rejects already-processed event IDs)
4. Controller dispatches to the appropriate handler based on event type
5. Handler updates the local `workspace_subscriptions` record
6. Controller records the billing event for idempotency after successful processing

## Polar Configuration

### Quick-Reference Checklist

Before the billing integration will work, complete these manual steps in the [Polar dashboard](https://polar.sh):

1. [ ] Create 1 product with usage-based pricing — see §1
2. [ ] Configure a webhook pointing to your API with 4 event types — see §2
3. [ ] Create 8 usage meters (storage, workflow_runs, ai_requests, api_requests, data_transfer, seats, compute_invocations, vectorizations) — see §3
4. [ ] Set per-meter pricing on the product — see §4
5. [ ] Add included usage as benefits on the product — see §5
6. [ ] Generate an API key — see §6
7. [ ] Set the 4 environment variables listed in the Environment Variables section

### 1. Create Product

Create one product in your [Polar dashboard](https://polar.sh):

| Env Var            | Base Price | Description                           |
| ------------------ | ---------- | ------------------------------------- |
| `POLAR_PRODUCT_ID` | Free (0€)  | Usage-based plan with metered billing |

The product should be configured as a **recurring subscription** in Polar with a free base price. All revenue comes from metered usage. Copy the product ID from the Polar dashboard into `POLAR_PRODUCT_ID`.

### 2. Configure Webhooks

In Polar dashboard under Settings > Webhooks:

- **Webhook URL:** `https://<your-api-domain>/api/v1/webhooks/polar`
- **Format:** `Raw` (standard JSON payload — not Discord or Slack)
- **Secret:** Generate a secret (Polar provides one prefixed with `whsec`\_). Set this as `POLAR_WEBHOOK_SECRET`.
- **Events to subscribe to:**
  - `subscription.created`
  - `subscription.updated`
  - `subscription.canceled`
  - `order.paid` (logged but no action taken)

The webhook uses [Standard Webhooks](https://www.standardwebhooks.com/) for signature verification.

### 3. Create Meters

In Polar dashboard under Products > Meters, create one meter per usage dimension:

| Meter Name            | Filter: Name equals    | Aggregation | Property            |
| --------------------- | ---------------------- | ----------- | ------------------- |
| Storage               | `storage`              | Sum         | `metadata.quantity` |
| Workflow Runs         | `workflow_runs`        | Sum         | `metadata.quantity` |
| AI Requests           | `ai_requests`          | Sum         | `metadata.quantity` |
| API Requests          | `api_requests`         | Sum         | `metadata.quantity` |
| Data Transfer         | `data_transfer`        | Sum         | `metadata.quantity` |
| Seats                 | `seats`                | Maximum     | `metadata.quantity` |
| Compute Invocations   | `compute_invocations`  | Sum         | `metadata.quantity` |
| Vectorizations        | `vectorizations`       | Sum         | `metadata.quantity` |

Use **Sum** for event-based meters and **Maximum** for the seats gauge meter (bills on peak seat count in the period).

### 4. Configure Metered Pricing

On the product, add a **metered price** for each meter:

| Meter                 | Amount per unit (EUR) | Unit       | Rate               |
| --------------------- | --------------------- | ---------- | ------------------ |
| Storage               | 0.02                  | GB         | 0.02 €/GB          |
| Workflow Runs         | 0.01                  | run        | 0.01 €/run         |
| AI Requests           | 0.05                  | request    | 0.05 €/request     |
| API Requests          | 0.0005                | request    | 0.50 €/1K requests |
| Data Transfer         | 0.05                  | GB         | 0.05 €/GB          |
| Seats                 | 5.00                  | seat       | 5.00 €/seat        |
| Compute Invocations   | 0.01                  | invocation | 0.01 €/invocation  |
| Vectorizations        | 0.001                 | document   | 0.001 €/document   |

These match the rate constants in `db/billing.go`. Storage and data transfer use GB as the billing unit — the API converts internal byte values to GB when reporting to Polar.

### 5. Add Included Usage (Benefits)

On the product, add a **benefit** for each meter to grant subscribers free included usage. Polar deducts these included units before billing overage, so subscribers only pay for usage above these thresholds.

| Meter                 | Included units | Human-readable          |
| --------------------- | -------------- | ----------------------- |
| Storage               | 5              | 5 GB                    |
| Workflow Runs         | 200            | 200 runs                |
| AI Requests           | 40             | 40 requests             |
| API Requests          | 4,000          | 4,000 requests          |
| Data Transfer         | 40             | 40 GB                   |
| Seats                 | 0              | 0 (first member free)   |
| Compute Invocations   | 100            | 100 invocations         |
| Vectorizations        | 1,000          | 1,000 documents         |

These match the free tier hard limit constants in `db/billing.go`. The included usage ensures subscribers get the same free allowance — they are only billed for usage above these amounts.

### 6. Get API Key

Generate an API key in Polar dashboard under Settings > API Keys. Set it as `POLAR_API_KEY`.

## Environment Variables

All billing env vars are optional. When `BILLING_ENABLED` is `false` (default), the billing service is not initialized.

| Variable               | Required             | Description                                                                                   |
| ---------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `BILLING_ENABLED`      | No                   | Set to `true` to enable billing features. Default: `false`                                    |
| `POLAR_API_KEY`        | When billing enabled | Polar API key for creating customers, checkouts, and portal sessions                          |
| `POLAR_WEBHOOK_SECRET` | When billing enabled | Standard Webhooks secret for verifying Polar webhook signatures (may include `whsec_` prefix) |
| `POLAR_PRODUCT_ID`     | When billing enabled | Polar product ID for the usage-based plan                                                     |

The console also needs `NEXT_PUBLIC_BILLING_ENABLED=true` to show the billing UI.

## API Endpoints

All endpoints require workspace-level authentication and the `billing:read` or `billing:write` permission.

| Method | Path                                            | Description                                               |
| ------ | ----------------------------------------------- | --------------------------------------------------------- |
| GET    | `/workspaces/{workspace}/billing/subscription`  | Get current plan info                                     |
| GET    | `/workspaces/{workspace}/billing/usage`         | Get current period usage                                  |
| GET    | `/workspaces/{workspace}/billing/usage/history` | Get usage history (query: `periods`, default 6)           |
| POST   | `/workspaces/{workspace}/billing/checkout`      | Create a Polar checkout session (add payment method)      |
| POST   | `/workspaces/{workspace}/billing/portal`        | Get Polar customer portal URL                             |
| POST   | `/api/v1/webhooks/polar`                        | Polar webhook receiver (no user auth, signature-verified) |

## Usage Tracking

### Dimensions

Usage dimensions are defined in `irmin-sdk-go/models/billing.go` and re-exported in `db/billing.go`.

| Dimension              | Constant                              | Internal unit | Polar/display unit      | Description                        |
| ---------------------- | ------------------------------------- | ------------- | ----------------------- | ---------------------------------- |
| `storage`              | `UsageDimensionStorage`               | bytes         | GB                      | Object storage consumed            |
| `workflow_runs`        | `UsageDimensionWorkflowRuns`          | runs          | runs                    | Workflow executions                |
| `ai_requests`          | `UsageDimensionAIRequests`            | requests      | requests                | AI/LLM API calls                   |
| `api_requests`         | `UsageDimensionAPIRequests`           | requests      | requests                | Core API calls                     |
| `data_transfer`        | `UsageDimensionDataTransfer`          | bytes         | GB                      | Data egress                        |
| `seats`                | `UsageDimensionSeats`                 | seats         | seats                   | Extra workspace members            |
| `compute_invocations`  | `UsageDimensionComputeInvocations`    | invocations   | invocations             | Sandbox code executions            |
| `vectorizations`       | `UsageDimensionVectorizations`        | documents     | documents               | Document embedding/vectorization   |

### Pricing Constants

Rate constants are defined in `db/billing.go`:

```go
RateStoragePerGB       = 0.02   // 0.02 € / GB
RateWorkflowRuns       = 0.01   // 0.01 € / run
RateAIRequests         = 0.05   // 0.05 € / request
RateAPIRequests        = 0.0005 // 0.50 € / 1K = 0.0005 € / request
RateDataTransferPerGB  = 0.05   // 0.05 € / GB
SeatRate               = 5.0    // 5.00 € / seat
RateComputeInvocations = 0.01   // 0.01 € / invocation
RateVectorizations     = 0.001  // 0.001 € / document vectorized
```

### How It Works

1. Middleware records usage events to a buffered channel (bytes for storage/transfer)
2. A background goroutine batches events and writes to the `usage_records` table
3. A periodic job aggregates records into `usage_summaries`
4. Another periodic job converts to display units (bytes→GB) and reports to Polar's `/v1/events/ingest` endpoint

## Database Tables

| Table                     | Description                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `workspace_subscriptions` | One per workspace. Links workspace to Polar customer/subscription, stores status and billing period info |
| `usage_records`           | Individual usage events with quantity, dimension, and period                                             |
| `usage_summaries`         | Aggregated usage per workspace/dimension/period                                                          |
| `billing_events`          | Processed webhook events for idempotency                                                                 |
