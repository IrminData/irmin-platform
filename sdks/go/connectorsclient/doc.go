// Package connectorsclient is the Irmin SDK client for the
// connector-service HTTP plugin protocol. It is the single client
// every Irmin service (Core, orchestrator, CLI) uses to talk to the
// connectors service; per-service re-implementations were folded in
// here so the wire contract lives in one place.
//
// The package covers both surfaces the connectors service exposes:
//
//   - Async job protocol for data-plane operations:
//     POST /operation/pull, /operation/push, /operation/patch →
//     202 Accepted + {job_id}, polled via GET /operation/status/:job_id,
//     fetched via GET /operation/result/:job_id, cancelled via
//     POST /operation/cancel/:job_id. WaitForJob drives the poll loop
//     in one call so callers don't re-implement the state machine.
//
//   - Synchronous metadata operations: GET /info,
//     POST /configuration/:type/fields, POST /configuration/validate,
//     POST /operation/schema/:method, POST /operation/subscribe,
//     POST /operation/unsubscribe. These are cheap, bounded calls —
//     putting them behind the job protocol would only add latency.
//
// Authentication: Bearer tokens on every request (system token for
// info/config/registration, operation token for schema/subscribe and
// the async data-plane). The client stamps an X-Irmin-Connection-Id
// header (see WithConnectionID) so OAuth-backed connectors can fetch
// the right access token from Core's internal endpoint without a
// second round-trip.
package connectorsclient
