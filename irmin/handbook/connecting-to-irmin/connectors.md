# Connector walkthroughs

Step-by-step guides for connecting Irmin to specific external systems.
Each walkthrough covers the connection form, any operator setup that
has to happen once per Irmin deployment (OAuth app registration, for
example), and a first working pull.

Before working through a walkthrough, skim
[How connections work](./how-connections-work.md) — the concepts
referenced below (details vs. settings, OAuth, schemas, operation
types) are defined there.

## Walkthroughs

End-to-end user guides for a handful of connectors available on Irmin.
The picks below are intentionally diverse — they cover the different
connector **types** Irmin supports (databases, generic APIs, SaaS,
storage, scraping), the different **authentication shapes**
(static credentials vs. OAuth), and the different **operation mixes**
(pull / push / patch / subscribe). If you understand these five, every
other connector in the catalogue fits one of these patterns.

| Connector | Type | Auth | Operations |
|---|---|---|---|
| [Postgres](#postgres) | Database | Static credentials | pull · push · patch · subscribe |
| [REST / HTTP](#rest--http) | Generic API | Bearer / basic / header | pull · push · patch |
| [Stripe](#stripe) | SaaS | Restricted API key | pull · push · patch (subscribe planned) |
| [Pinecone](#pinecone) | Vector store | API key | pull · push |
| [Firecrawl](#firecrawl) | Web scraping | API key | pull (async) |

### Postgres

Connect Irmin to a Postgres database to pull tables in (for versioning
and analysis) or push data back out. The canonical static-credential
connector: if you understand this one, every other database connector
follows the same pattern.

#### Capabilities

| Operation | Supported | What it does |
|---|:-:|---|
| Pull | ✅ | Export tables as CSV files into a LakeFS branch |
| Push | ✅ | Load CSV files into Postgres tables |
| Patch | ✅ | Apply JSON-Patch operations to rows |
| Subscribe | ✅ | Emit change events via logical replication |

#### Prerequisites

- A Postgres 12+ database Irmin can reach (public IP, or VPN/tunnel
  into a private network).
- Credentials with the privileges you need for the operations you plan
  to run:
  - **Pull only**: `SELECT` on the tables you want to pull.
  - **Push**: `SELECT, INSERT, UPDATE, DELETE` on target tables;
    `CREATE` if you want Irmin to create tables automatically.
  - **Subscribe**: a user with the `REPLICATION` attribute and a
    replication slot on the database.

#### Setting up the connection

From the connections page in your workspace, click **New connection**
and pick **Postgres** from the catalogue.

**Details** (credentials and connection target; stored encrypted at
rest):

| Field | What it means | Example |
|---|---|---|
| **Host** | Server hostname or IP | `db.example.com` |
| **Port** | Postgres port | `5432` (default) |
| **Username** | Postgres username | `irmin_reader` |
| **Password** | Postgres password | *(masked)* |
| **SSL Mode** | TLS policy | `require` (recommended) |

**Settings** (workspace-scoped choices; visible and editable after
save):

| Field | What it means | Example |
|---|---|---|
| **Database** | Which database on the server | `production` |
| **Schema** | Which schema within the database | `public` |

Irmin fetches the available databases/schemas from the server using
the credentials you entered, so you'll see a dropdown populated with
live values (no typing).

**Configure + test.** Irmin runs a full connection test:

1. TCP reach to host:port
2. TLS handshake
3. Authentication with username/password
4. Schema read to confirm the user can list tables

If any step fails, you'll see the specific error. Common failures:

- **"connection refused"** — firewall blocking, or Postgres not
  listening on that address.
- **"authentication failed"** — wrong credentials or the user account
  doesn't exist.
- **"pg_hba.conf rejects connection"** — the Postgres server's
  host-based auth config doesn't allow your Irmin instance's IP.
- **"SSL required"** — your database enforces TLS but you set SSL
  Mode to `disable`.

Once the test passes, the connection is saved and ready to use.

#### First pull

1. From the connection detail page, click **Pull** → **Configure new
   pull**.
2. Pick one or more tables from the auto-discovered schema.
3. Pick a target LakeFS repository and branch where the CSV files
   should land.
4. Click **Run**.

Irmin streams the selected tables as CSV files inside a ZIP archive,
applies any configured field mappings through DuckDB, and uploads the
result as a commit on the target branch. You'll see progress in the
operation log.

#### Common next steps

- **Set up a nightly import workflow** so the data refreshes
  automatically.
- **Chain a compute sandbox action** after the pull to transform the
  data before committing (e.g., PII redaction, column normalization).
- **Subscribe to changes** — if you need real-time replication rather
  than scheduled pulls, configure a subscription against a logical
  replication slot.

#### Gotchas

- **Large tables**: by default, Irmin streams the whole table. For
  tables larger than ~500MB, use a `WHERE` filter in the table
  configuration or split into multiple pulls.
- **Timezone-naive timestamps**: Postgres `TIMESTAMP WITHOUT TIME
  ZONE` columns are left as-is. Set the database's `timezone`
  parameter or cast explicitly if you need UTC.
- **Changing credentials**: after a password rotation, edit the
  connection and type the new password. Leave `SECRET` in place for
  unchanged fields; only replace what actually changed.

### REST / HTTP

The HTTP connector lets Irmin talk to any REST API — a generic
fallback when there's no dedicated connector for the specific vendor
you need. You configure the endpoint, headers, and request shape;
Irmin treats the response body as the data to version.

#### Capabilities

| Operation | Supported | What it does |
|---|:-:|---|
| Pull | ✅ | Issue a GET (or any method) and save the response as a JSON file |
| Push | ✅ | Send data to an endpoint as a POST/PUT body |
| Patch | ✅ | Send JSON-Patch operations to endpoints that accept them |
| Subscribe | — | Not supported — use vendor-specific connectors for webhooks |

#### When to use this connector

- You need to integrate with a vendor that doesn't yet have a dedicated
  Irmin connector.
- The data you're pulling is simple enough to represent as a single
  JSON document per pull.
- The external system uses Bearer tokens, API keys in headers, or
  basic auth — not OAuth-with-PKCE. (For OAuth, wait for the
  vendor-specific connector.)

For more structured data, better schema discovery, or vendor-specific
features (pagination, rate-limit handling), use the dedicated
connector when one exists.

#### Setting up the connection

From the connections page, click **New connection** and pick **HTTP**
from the catalogue.

**Details** (credentials and base authentication):

| Field | What it means | Example |
|---|---|---|
| **Authentication type** | How the API authenticates requests | `bearer`, `basic`, `header`, `none` |
| **Token / Password / Key** | The secret value for the chosen auth | `Bearer eyJhbGciOiJ...` or a password |
| **Header name** (if header auth) | Which header carries the key | `X-API-Key` |

The concrete fields you see depend on the authentication type you pick
(dynamic configuration in action).

**Settings** (where the requests go):

| Field | What it means | Example |
|---|---|---|
| **Base URL** | The endpoint prefix | `https://api.example.com/v1` |
| **Default headers** | Added to every request | `Accept: application/json` |
| **Timeout (seconds)** | Per-request timeout | `30` |

**Configure + test.** The test does a simple `GET {base_url}/` and
checks:

- TLS handshake succeeds
- Authentication header is accepted (non-401 response)
- Response is readable within the timeout

If the API root doesn't return 200, you can override the test endpoint
in advanced settings (e.g., `/healthz` or `/status`).

#### First pull

1. From the connection detail page, click **Pull** → **Configure new
   pull**.
2. Fill in:
   - **Path** — the endpoint path, appended to the base URL
     (`/customers`, `/orders/recent`).
   - **Method** — default `GET`; override as needed.
   - **Query parameters** — key-value pairs appended to the URL.
   - **Request body** (for POST/PUT) — raw JSON.
3. Pick a target LakeFS repository and branch.
4. Click **Run**.

Irmin saves the response body as a single JSON file on the chosen
branch. File name is derived from the path, with `.json` appended.

#### Operating patterns

**Pagination.** Most APIs paginate. The HTTP connector doesn't
auto-paginate (it does one request per pull), so two options:

1. **Pull each page separately** and configure a workflow that walks
   the pagination cursor. Straightforward for cursor-based APIs.
2. **Use a compute sandbox action** after the pull to call the API
   repeatedly until the cursor is exhausted, concatenating results.
   More flexible for complex APIs.

**Authentication refresh.** If your API uses tokens that rotate,
update the connection's **Token** field. Because credentials are
encrypted, you'll see `SECRET` in the form — overwrite with the new
value and save.

**Rate limits.** The HTTP connector respects `Retry-After` headers
when the API returns 429. For more aggressive throttling, configure
the timeout low and chain a compute action that handles backoff
explicitly.

#### Gotchas

- **No automatic pagination** — by design. Use workflows or compute
  sandbox actions to stitch pages together.
- **JSON schema discovery is best-effort** — Irmin samples the first
  pull's response shape. If the API returns variable schemas (some
  fields present only sometimes), you may need to pin the schema
  manually in the connection settings.
- **Binary responses** are saved as-is with a generic MIME type.
  "Everything is a File" works, but downstream CSV mappings won't
  apply to binary data.
- **Self-signed TLS certs** are rejected by default. If you need to
  connect to a development server with a self-signed cert, we
  recommend fronting it with a proper reverse proxy rather than
  disabling cert verification.

### Stripe

Connect Irmin to a Stripe account to pull charges, subscriptions,
invoices, customers, and payouts into a versioned repository, and to
push or patch customers, invoices, products, and prices. Authenticated
with a Stripe **restricted API key** — the merchant controls exactly
which resources and scopes Irmin can touch, with no Stripe Connect
platform setup on either side.

#### Capabilities

| Operation | Supported | What it does |
|---|:-:|---|
| Pull | ✅ | Export Stripe resources (customers, charges, subscriptions, invoices, payouts) as JSON arrays into a LakeFS branch |
| Push | ✅ | Create or update Stripe objects by pushing a JSON file to the path of the target resource (e.g., `customers/cus_abc.json`, `customers/new-alice.json`). Writable resources: customers, invoices, products, prices |
| Patch | ✅ | Apply a JSON-Patch to an existing Stripe object — partial updates like "set this customer's email" or "add a metadata key to this invoice" |
| Subscribe | Planned | Stripe webhooks for real-time events |

#### Prerequisites

- A Stripe account (live or test mode). For evaluation, Stripe's test
  mode gives you full functionality without real transactions.
- Permission to create an API key on the Stripe account — owner or
  developer role is enough.

#### Why not OAuth?

Stripe's OAuth (Stripe Connect) requires you to register a platform
app per environment and doesn't support dynamic client registration
(RFC 7591). That's a lot of ops setup for the same end result — a
scoped credential — that a Stripe restricted API key already gives
you. Future OAuth-backed connectors will ship for vendors that
actually benefit from the flow (Linear, Intercom, Monday, Sentry).

#### Setting up the connection

From the connections page, click **New connection** and pick
**Stripe** from the catalogue.

**Generate a restricted API key.**

1. Open the [Stripe API keys page](https://dashboard.stripe.com/apikeys).
2. Click **Create restricted key**.
3. Give the key a descriptive name (e.g., `Irmin — production pull`).
4. Set permissions per resource:
   - **Read** on Customers, Charges, Invoices, Subscriptions, Payouts
     if you want to pull them.
   - **Write** on Customers, Invoices, Products, Prices if you want
     Irmin to push or patch those resources. Leave the rest at
     **None** for least-privilege.
5. Click **Create key** and copy the `rk_live_…` (or `rk_test_…`)
   value once. Stripe only shows it to you on creation; save it in
   your password manager.

**Paste the key into Irmin.**

| Field | What it means | Example |
|---|---|---|
| **Stripe API key** (required) | The restricted key you just created. `sk_...` secret keys also work but grant full account access — prefer restricted. | `rk_live_51Nv12ab…` |
| **Stripe API version** (optional) | Pinned API version stamped on the `Stripe-Version` header. Leave empty to use Irmin's default (`2026-03-25.dahlia`). | `2026-03-25.dahlia` |

**Configure + test.** Irmin verifies the key by calling
`GET /v1/charges?limit=1`. If it returns data (or a valid empty
result), the connection is confirmed.

If the test fails:

- **"Stripe rejected the API key"** — the key is wrong, expired, or
  missing the Charges-read permission. Regenerate on Stripe and
  paste again.
- **"Stripe API call failed"** — network-level problem reaching
  `api.stripe.com`. Check outbound connectivity from the connector
  host.

#### First pull

1. From the connection detail page, click **Pull** → **Configure new
   pull**.
2. Leave the path empty to pull every enabled resource, or set it to
   a single resource name (e.g., `customers`) or a single record
   (e.g., `customers/cus_Nv12ab`).
3. Pick a target LakeFS repository and branch.
4. Click **Run**.

Irmin fetches each resource via Stripe's list API, auto-paginates
(100 records per page, Stripe cursor-based), and writes one JSON
array file per resource (`customers.json`, `charges.json`, …) to the
target branch. Subsequent pulls produce a new commit on the branch —
view the diff to see what changed between snapshots.

Want columnar queries? Run a downstream DuckDB action against the
pulled JSON — parsing a JSON array into a Parquet table is a
one-liner and keeps the pull itself simple.

#### Pushing and patching (writes)

Stripe's write semantics map cleanly onto Irmin's path-based operation
schemas — see the
[How connections work](./how-connections-work.md) page for the
underlying "Everything is a File" model. For Stripe, paths look like
`{resource_type}/{id-or-new-*}.json`.

**Push** — create or update an object. The filename determines which:

- `customers/cus_Nv12ab34.json` — update an existing customer by
  sending the file contents to Stripe's Update Customer API.
- `customers/new-enterprise-signup.json` — any file whose name starts
  with `new-` (or is exactly `new.json`) creates a new record. Irmin
  POSTs to Create Customer; Stripe assigns the real `cus_…` id.
- `invoices/new-invoice.json`, `products/new-product.json`,
  `prices/new-price.json` — same pattern for every writable resource.

**Patch** — apply a JSON-Patch document to an existing object. Useful
for targeted updates without round-tripping the full record:

- Patch `/customers/cus_Nv12ab34.json/email` with
  `{"op":"replace","value":"new@example.com"}` to just change the
  email.
- Patch `/invoices/in_1Nv12.json/metadata/priority` with
  `{"op":"add","value":"urgent"}` to annotate.

Irmin coalesces every patch op targeting the same resource into a
single Stripe update call, sending only the changed fields. Safer
than a full push for concurrent edits — it doesn't clobber fields a
teammate updated meanwhile.

Either operation can be triggered manually from the connection page,
or driven from a workflow (e.g., "after a Postgres pull, push any new
rows as Stripe customers"). Failures surface Stripe's error message
directly — `invalid email format`, `cannot invoice a deleted
customer`, etc. — so you can see exactly what Stripe rejected.

#### Disconnecting

Click **Disconnect** on the connection page. Irmin deletes the
stored API key. If you want to revoke the key at Stripe too (so a
copy on another machine couldn't still use it), visit the
[API keys page](https://dashboard.stripe.com/apikeys) and click
**Delete** next to the key.

#### Gotchas

- **Only one Stripe account per connection.** If you need data from
  multiple Stripe accounts (e.g., a parent org with separate brand
  accounts), create separate Connections with separate restricted
  keys.
- **Least-privilege scoping lives on the key, not on Irmin.** The
  permissions you pick when creating the restricted key decide what
  Irmin can do. If a push fails with "permission denied," it's
  because the key doesn't have Write on that resource — regenerate
  with the right permissions instead of looking for an Irmin toggle.
- **API version drift.** If Stripe deprecates a field in a newer API
  version, your pinned version protects you. But it also means you'll
  miss new fields Stripe has added since your pinned date. Bump the
  pin in settings when you want the new fields.
- **Rate limits.** Stripe allows 100 requests/second by default.
  Large pulls auto-throttle; very large historical backfills may take
  time. Configure the pull as a workflow so it runs in the background.
- **Idempotency on writes.** Every push and patch is sent with a
  deterministic `Idempotency-Key` derived from the file contents, so
  re-running the same workflow never duplicates customers/invoices.
  Stripe's idempotency window is 24 hours — after that, the same
  content reuses the stored response. Change the file and push again,
  Stripe treats it as a new write.
- **Irreversible writes.** Stripe doesn't support "undo." A bad push
  or patch modifies real Stripe data that isn't rolled back by
  reverting the Irmin commit. Test write workflows against Stripe
  test mode (a second connection with an `rk_test_…` key) before
  pointing them at a live account.
- **Restricted-key creation auditing.** Stripe records every
  restricted-key creation in the account's audit log. Naming the key
  descriptively (e.g., `Irmin — production pull`) makes it easy to
  find and revoke later.

### Pinecone

Connect Irmin to a Pinecone index to version your vector embeddings
alongside the rest of your data. Pull embeddings for archival and
comparison; push new vectors from workflows.

#### Capabilities

| Operation | Supported | What it does |
|---|:-:|---|
| Pull | ✅ | Fetch vectors from a Pinecone index as JSON files |
| Push | ✅ | Upsert vectors into a Pinecone index from JSON |
| Patch | — | Pinecone's model is set-based, not patch-based |
| Subscribe | — | Pinecone doesn't emit change events |

#### Why version vector embeddings?

Embeddings are a function of the upstream data *and* the model
version. When either changes:

- A model upgrade (text-embedding-3-small → text-embedding-3-large)
  produces different vectors for the same inputs.
- An upstream schema change (new field included in the embedded text)
  shifts the embedding space.

Versioning lets you roll back a bad embedding refresh the same way
you'd roll back a bad code deploy.

#### Prerequisites

- A Pinecone account with at least one index created.
- A Pinecone API key with read and write access (Pinecone's default
  API keys are read-write).

#### Setting up the connection

From the connections page, click **New connection** and pick
**Pinecone** from the catalogue.

**Details:**

| Field | What it means | Example |
|---|---|---|
| **API key** | Your Pinecone API key | *(masked)* |
| **Environment** | The Pinecone environment (region) | `us-west-2-aws`, `gcp-starter` |

Find both in your Pinecone console under **API Keys**.

**Settings:**

| Field | What it means | Example |
|---|---|---|
| **Index** | Which Pinecone index this connection targets | `production-embeddings` |
| **Namespace** | Optional namespace within the index | `customer-support` |

If you leave namespace empty, Irmin uses the default namespace.

**Configure + test.** The test calls Pinecone's
`describe_index_stats` on the configured index to verify:

- API key is valid
- Environment is correct
- The named index exists and you have access

If this passes, the connection is saved.

#### First pull

1. From the connection detail page, click **Pull** → **Configure new
   pull**.
2. Fill in:
   - **Filter** (optional) — metadata filter to restrict which
     vectors to pull (Pinecone metadata filter syntax, e.g.,
     `{"category": "faq"}`).
   - **Top-K** — max vectors to pull per call.
3. Pick a target LakeFS repository and branch.
4. Click **Run**.

Irmin saves each vector as a JSON object with `id`, `values`
(the vector itself), `metadata`, and optional `sparseValues`. Multiple
pulls accumulate as commits on the branch, so you can see how the
index evolved.

#### Pushing vectors

Typical workflow for refreshing embeddings:

1. A **compute sandbox action** reads source text from a LakeFS
   repository and calls an embedding model (OpenAI, Cohere, local) to
   produce vectors.
2. The compute action writes a JSON file with the vectors.
3. A **push operation** to this Pinecone connection upserts the
   vectors into the target index.

The push operation accepts a JSON array of objects matching Pinecone's
upsert format: `[{id, values, metadata}, ...]`. Irmin batches them
into Pinecone's max batch size automatically.

#### Gotchas

- **Pinecone rate limits** — free and starter tiers have lower
  query-per-second limits. Very large pulls/pushes may need to be
  chunked or throttled.
- **Vectors are large** — a pull of 1M vectors at 1536 dimensions is
  ~6GB. Use filters to pull slices, not the whole index, unless you
  actually need a full archive.
- **Metadata-only updates** — Pinecone supports updating only the
  metadata on existing vectors, but the Irmin push operation always
  sends the full vector payload. To update metadata only, use a
  compute sandbox action that reads the current vector, modifies
  metadata, and pushes the whole thing back.
- **Cost awareness** — Pinecone's serverless tier charges per read
  and write. Frequent full-index pulls add up; prefer incremental
  pulls with metadata filters.

### Firecrawl

Connect Irmin to Firecrawl to pull web-scraped content into versioned
Irmin repositories. Useful for content monitoring, SEO snapshots,
training-data pipelines, and any workflow that treats a collection of
web pages as a data source.

#### Capabilities

| Operation | Supported | What it does |
|---|:-:|---|
| Pull | ✅ | Scrape web content and save as structured files |
| Push | — | Firecrawl is a source, not a destination |
| Patch | — | Same |
| Subscribe | — | Firecrawl doesn't emit change events |

#### Prerequisites

- A Firecrawl account (free tier works for evaluation).
- A Firecrawl API key from your Firecrawl dashboard.

#### Setting up the connection

From the connections page, click **New connection** and pick
**Firecrawl** from the catalogue.

**Details:**

| Field | What it means | Example |
|---|---|---|
| **API key** | Your Firecrawl API key | *(masked)* |

That's the only detail — Firecrawl authenticates with a single API
key.

**Settings:**

| Field | What it means | Example |
|---|---|---|
| **Default format** | Output format for scraped content | `markdown`, `html`, `screenshot` |
| **Default timeout (seconds)** | Per-scrape timeout | `30` |

Both are overridable per-pull; these are just the defaults the
connection uses when not specified.

**Configure + test.** The test calls Firecrawl's API with a minimal
request to verify:

- API key is valid
- You haven't hit your account's rate limit

If this passes, the connection is saved.

#### First pull

Firecrawl's async nature makes it a good example of the **async pull**
pattern:

1. From the connection detail page, click **Pull** → **Configure new
   pull**.
2. Pick the pull mode:
   - **Single URL scrape** — scrape one URL, return its content.
   - **Crawl** — start at a seed URL and follow links within the
     same domain up to a depth.
   - **Sitemap crawl** — pull all URLs from a site's sitemap.xml.
3. Fill in the mode-specific options:
   - **URL(s)** — the seed(s).
   - **Max depth** (crawl mode) — how many levels of links to follow.
   - **Include patterns** / **exclude patterns** — regex filters to
     scope what gets pulled.
   - **Format** — markdown, HTML, screenshots, or structured (JSON
     extraction with a schema).
4. Pick a target LakeFS repository and branch.
5. Click **Run**.

For single-URL scrapes, the result is usually ready within seconds.
For crawls, Firecrawl does the work asynchronously — Irmin polls
until the crawl completes, then downloads and saves the results as
one file per scraped URL on the target branch.

#### Operating patterns

**Periodic content snapshots.** Set up a scheduled workflow that
pulls the same URLs nightly or weekly. Each pull becomes a commit on
the branch — you can `diff` between commits to see what changed on
the site between snapshots.

**Training data pipelines.** Combine Firecrawl with a **compute
sandbox action** downstream:

1. Firecrawl pull → markdown files in LakeFS.
2. Compute action reads the files, cleans them (strip nav, ads,
   etc.), chunks them into embedding-sized pieces.
3. **Push** to a Pinecone index (via the Pinecone connector) for
   retrieval.

**Structured extraction.** Firecrawl's `extract` mode uses an LLM to
pull specific fields out of each scraped page based on a schema you
provide. Use this when:

- You want structured data (product prices, article metadata), not
  raw markdown.
- The target site has a stable enough structure that extraction is
  reliable.

Define the schema in the pull's **Extraction schema** field as a
JSON Schema. Irmin saves the extraction results as JSON matching your
schema.

#### Gotchas

- **Rate limits** — Firecrawl's free tier is strictly limited. For
  production use, upgrade to a paid plan and configure your crawl
  rate accordingly. Irmin respects the `Retry-After` header on 429
  responses.
- **Long crawls block the operation** — a large crawl may take
  minutes. Configure it as a background workflow, not an interactive
  pull, so you're not waiting in the UI.
- **JavaScript-heavy sites** — Firecrawl runs a headless browser,
  so most JS-rendered content works. But single-page apps with
  complex client-side routing may need explicit `wait_for`
  configuration — see Firecrawl's docs.
- **Legal + ethical** — you are responsible for respecting
  `robots.txt`, site terms of service, and copyright. Irmin doesn't
  check either; that's on you.
- **Content freshness** — Firecrawl scrapes live when called; cached
  results are not reused across pulls unless you explicitly configure
  a cache.

## Don't see the connector you need?

New connectors are added regularly. Two paths:

1. **Ask us** — contact support or open a GitHub issue with the
   external system you want to connect.
2. **Build it yourself** — the
   [irmin-connectors](https://github.com/IrminData/irmin-connectors)
   repository has builder guides (`guides/how-to-create-connectors.md`,
   `guides/connector-architecture.md`, `guides/oauth-connectors.md`).
   The connector SDK is open — contributions welcome.
