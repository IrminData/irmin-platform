<img src="https://github.com/IrminData/irmin-frontend/blob/development/public/irmin-logo-light.svg" width="200" alt="Irmin Logo">

# Irmin AI

Fastify-based AI chat API with streaming responses, Groq/OpenAI integration, and MCP tools support.

## What it does

- **Streaming chat API** with real-time AI responses
- **Multiple AI providers** (Groq, OpenAI) with model switching
- **MCP tools integration** for external tool access
- **Conversation management** with SQLite storage
- **Token tracking** and cost analytics

## Quick Start

1. **Install dependencies:**
```bash
pnpm install
```

2. **Set environment variables:**
```bash
cp .env.example .env
# Add your API keys and update other variables as required:
# GROQ_API_KEY=your_groq_key
# OPENAI_API_KEY=your_openai_key
```

3. **Run:**
```bash
pnpm dev          # Development
pnpm build && pnpm start  # Production
```

## API Routes

See [API.md](API.md) for detailed API documentation.

## Usage

```bash
# Basic chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "provider": "groq"}'

# With MCP tools
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-irmin-jwt-token>" \
  -d '{"message": "List repositories", "useTools": true}'
```

## Environment Variables

See [.env.example](.env.example) for required and optional variables.

## Development

```bash
pnpm dev          # Development server
pnpm typecheck    # Type checking
pnpm lint         # Linting
pnpm build        # Build for production
```

## Database

Uses SQLite with Drizzle ORM. Tables:
- `conversations` - Chat conversations
- `messages` - Individual messages with token usage
- `ai_models` - Available AI models and pricing
- `analytics` - Usage tracking and events

## MCP Tools

Model Context Protocol tools provide external tool access. Configure in `src/services/mcp.ts`.
