# Connecting Irmin to Your Tools

Irmin becomes useful when it's hooked up to the systems where your data
actually lives. This section explains **how connections work** in
Irmin — the moving parts, what you fill in, what gets encrypted, how
you use them in workflows — and walks through setup for a handful of
common connectors.

## What's in this section

- **[How connections work](./connecting-to-irmin/how-connections-work.md)** —
  the foundational concepts: details vs. settings, OAuth vs.
  credentials, connection testing, supported operation types, schemas,
  and the "Everything is a File" philosophy that makes Irmin's
  versioning work across any source.
- **[Connector walkthroughs](./connecting-to-irmin/connectors.md)** —
  step-by-step guides for connecting Irmin to specific tools, chosen
  to cover the different connector types (DB / generic API / SaaS /
  vector store / scraping), auth shapes (static credentials vs.
  OAuth), and operation mixes (pull / push / patch / subscribe):
  - [Postgres](./connecting-to-irmin/connectors.md#postgres)
  - [REST / HTTP](./connecting-to-irmin/connectors.md#rest--http)
  - [Stripe](./connecting-to-irmin/connectors.md#stripe) (OAuth)
  - [Pinecone](./connecting-to-irmin/connectors.md#pinecone) (vector store)
  - [Firecrawl](./connecting-to-irmin/connectors.md#firecrawl) (web scraping)

## Who this is for

End users of Irmin who want to plug a data source in and start using
it. No code required — everything in this section is driven from the
Irmin console.

If you're building a *new* connector (not just using an existing one),
see the [connector structure](TODO-internal: connector-structure) documentation
and the `irmin-connectors` repository's `guides/` directory for the
builder's perspective.
