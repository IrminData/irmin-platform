// Package connectorsclient is the Irmin SDK client for the
// connector-service HTTP plugin protocol.
//
// At present the package intentionally covers only the asynchronous
// pull protocol — POST /operation/pull (202 + job_id), GET
// /operation/status/:job_id, GET /operation/result/:job_id, and
// POST /operation/cancel/:job_id — because that is the surface Core
// needs to stop buffering large zips in memory and avoid Railway's
// ~300s edge timeout on long Stripe / Pinecone / Postgres pulls.
//
// Core today has an in-repo connectors-client with the full set of
// synchronous endpoints (init, pull, push, patch, subscribe, etc.).
// Migration plan:
//
//  1. SDK publishes these async types + methods (this package).
//  2. Core's in-repo client switches to depend on these for the
//     async endpoints, keeping the existing sync helpers for
//     everything else.
//  3. Remaining helpers move into this SDK package incrementally.
//
// Consumers that only need the async protocol (tests, tooling) can
// use this package standalone. It carries no transitive dependency
// on Core or the connectors service beyond the shared SDK models.
package connectorsclient
