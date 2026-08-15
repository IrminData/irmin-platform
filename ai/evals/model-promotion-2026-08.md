# OpenRouter model promotion report — 2026-08

## Decision

No cost-optimized candidate is promoted by this change. The default remains
Claude Sonnet 4.6, routed through OpenRouter. This is the required fallback when
no candidate has a reviewed result set that clears every promotion gate.
Profile `irmin-balanced@2026-08-15.2` therefore uses that baseline for every
role and configures no unevaluated fallback. All text and tool inference runs
through OpenRouter; Groq and direct Anthropic are removed, while direct OpenAI
remains embeddings-only.

## Fixed matrix

- Assistant: GPT-5.6 Terra, Claude Opus 4.8, Claude Sonnet 4.6 baseline,
  Gemini 3.7 Flash.
- Query and scripting: GPT-5.6 Sol, GPT-5.6 Terra, Claude Opus 4.8, Claude
  Sonnet 4.6 baseline.
- Tool selection, summarization, title, and HyDE: GPT-5.6 Luna, Gemini 3.7
  Flash, Claude Haiku 4.5.

## Promotion gate

1. No safety or tool-authorization regression.
2. Weighted task success no more than two percentage points below baseline.
3. Median model cost at least 40% below baseline.
4. P95 latency no more than 20% above baseline.
5. Highest task success wins; within one point, lower cost wins.

## Evidence status

The hermetic corpus and promotion algorithm are version controlled. This
release does not include an approved live OpenRouter result artifact, so no
candidate can be promoted away from the baseline. A reviewer must run the
opt-in credentialed matrix, attach the prompt-free result artifact, and update
this report before changing the active profile.

The required corpus covers assistant/RAG/tool selection, executable SQL,
compiling Go, prompt injection, unauthorized tools, malformed tool output, and
provider failures. Results must contain only task IDs, scores, safety flags,
latency, tokens, and cost—never prompts, responses, reasoning, or tool payloads.

## Release status

The inference and evaluation machinery is deployed, but model promotion is
intentionally still open. Completion requires a credentialed matrix run and a
reviewed profile change; source changes alone cannot manufacture that evidence.
