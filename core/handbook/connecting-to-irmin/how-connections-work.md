# How connections work

A **Connection** in Irmin is a link between your workspace and an
external system — a database, a SaaS product, a file store, an API.
Once a connection is set up, Irmin can pull data *from* it, push data
*to* it, react to changes in it, and version everything it touches.

This page explains the pieces you'll see when creating or managing a
connection, so you know what to fill in and why.

## Connectors vs. connections

- A **connector** is a category: Postgres, Stripe, HubSpot, Pinecone,
  HTTP. Every connector is an independent application that knows how
  to talk to one specific external system.
- A **connection** is an instance of a connector in *your* workspace —
  your specific database, your specific Stripe account, your specific
  Pinecone project.

You pick a connector once, then create as many connections as you need
(one per database, per API account, etc.).

## Creating a connection, step by step

Every connection creation wizard has the same four steps:

1. **Pick a connector** — from the catalogue (Postgres, Stripe, ...).
2. **Fill in the details** — the credentials (or authorise via OAuth,
   for supported vendors).
3. **Fill in the settings** — which database, which project, which
   folder within the external system you want to work with.
4. **Configure + test** — Irmin verifies the connection works end-to-end
   before saving.

The difference between "details" and "settings" is important:

| Field | What it is | Encrypted? | Editable after? | Example |
|---|---|---|---|---|
| **Details** | Credentials or identity (password, API key, OAuth token) | Yes, at rest | Masked as `SECRET`; replace-only | `username`, `password`, `api_key` |
| **Settings** | What scope in the external system to work with | No | Yes, visible + editable | `database`, `schema`, `project_id`, `folder_path` |

Rule of thumb: if revealing the value would be a security issue, it's
a detail. Otherwise it's a setting.

## Authentication methods

Irmin supports two ways an external system can authenticate your
connection:

### Static credentials (username + password, API key, etc.)

The classic pattern. You enter the credentials in the connection form;
Irmin stores them encrypted at rest using AES-256-GCM. When Irmin needs
to talk to the external system, it decrypts them briefly to make the
call, then discards the plaintext.

Used by: Postgres, MySQL, SFTP, HTTP/REST, Firecrawl, Pinecone, and
most self-hosted or developer-tool integrations.

### OAuth 2.0 (authorise via browser)

For SaaS vendors that support it (Stripe, HubSpot, Linear, Google
Drive, ...), Irmin redirects you to the vendor's login page, where you
authorise Irmin to access your account. The vendor returns a token
directly to Irmin — you never paste a password into Irmin, and Irmin
never sees your vendor-account password at all.

What Irmin stores:
- A short-lived **access token** (typically minutes to hours) —
  encrypted at rest, refreshed automatically when it expires.
- A longer-lived **refresh token** (typically months) — used to get
  new access tokens without re-prompting you.

When you click "Disconnect," Irmin:
1. Asks the vendor to revoke the tokens (best effort).
2. Deletes the stored tokens from the Irmin database.
3. The next pull/push will say "reconnect required" until you re-authorise.

## Connection testing

After the wizard, Irmin runs a full round-trip against the external
system to confirm:

- **Network reachability** — can we reach the host?
- **Authentication** — are the credentials / OAuth token valid?
- **Authorisation** — does the account have permission to do what the
  connection needs?
- **Schema discovery** — can we read the list of tables / objects /
  resources the connection is scoped to?

If any step fails, Irmin shows the specific error so you can fix it
before saving. You can re-run the test anytime from the connection
detail page.

## Supported operation types

A connector can support any combination of these operations. Which are
available depends on the connector:

| Operation | Direction | What it does | Example |
|---|---|---|---|
| **Pull** | External → Irmin | Copy data out of the external system into Irmin | "Pull all Stripe charges into a Parquet file" |
| **Push** | Irmin → External | Copy data from Irmin to the external system | "Push this CSV to a Postgres table" |
| **Patch** | Irmin → External | Apply incremental changes | "Update this one row in the external system" |
| **Subscribe / Patch event** | External → Irmin (event-driven) | Emit change events via webhook | "When a Stripe customer's email changes, trigger a workflow" |

When you create a connection, Irmin shows you which operations are
supported. In workflows, each stage picks an operation that matches one
of these.

## "Everything is a File"

Irmin normalises every piece of data — regardless of its source shape —
into files. This is the philosophy that makes version control work
across any backend:

| External shape | Irmin representation |
|---|---|
| Database table | CSV file in a ZIP archive |
| REST API JSON response | JSON file |
| Vendor document (PDF, image) | Original format file |
| Spreadsheet | CSV file |
| Vector store embeddings | JSON / Parquet file |
| Webhook event | JSON Patch entry |

Because everything is a file, everything is diffable, commitable,
branchable, mergeable — the same way code is in Git. You can roll back
a bad Stripe pull the same way you'd roll back a bad code deploy.

## Connection schemas

Every connection exposes a **schema** — a typed description of what the
data looks like. Irmin uses this schema to:

- Validate field mappings during import/export
- Render tabular previews in the console
- Compute structural diffs between versions
- Power DuckDB queries over the ingested data

The schema is discovered automatically when you create the connection,
and re-discovered any time you run a pull/push operation. It refreshes
if the external system's shape changes (e.g., new Postgres columns,
new Stripe fields).

## Encryption at rest

Irmin encrypts every `details` value — all credentials, API keys, OAuth
tokens — at rest using AES-256-GCM with a keyring supplied at
deployment time. Plaintext only exists briefly in memory during an
operation.

You'll never see a credential echoed back to you: the console always
shows `SECRET` placeholders. When you edit a connection, leave the
field as `SECRET` to keep the existing value, or type a new value to
replace it.

See the [administrator's configuration guide](TODO-internal: products/api)
for operational details on keyring management and rotation.

## Using connections in workflows

Connections are the raw material. Workflows are what put them to use.
Common patterns:

- **Scheduled import** — nightly cron that pulls data from a
  connection into a LakeFS repo, versioning each day's state.
- **Event-driven export** — when a LakeFS commit lands, push the
  changed files to an SFTP bucket or REST API.
- **Pipeline** — multi-stage workflow combining multiple connections
  (pull from Stripe → transform in compute sandbox → push to Postgres).
- **Subscribe / react** — the connection emits webhooks when the
  external system changes; a workflow triggers on each event.

All four patterns treat the connection as a typed operation endpoint.
Once the connection is set up, the workflow doesn't need to know
*what* the external system is — it just calls pull/push/patch.

## Next steps

- **[Connector walkthroughs](./connectors.md)** — step
  by step setup guides for specific connectors.
- **[Repositories](TODO-internal: concepts/repositories)** — where pulled
  data lives and gets versioned.
- **[Compute sandbox](TODO-internal: concepts/compute-sandbox)** — running
  transformations on the data between pull and push.
