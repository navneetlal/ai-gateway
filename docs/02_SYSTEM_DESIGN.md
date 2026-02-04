# System Design

## Architecture Overview

- **Type**: REST API (OpenAI-compatible proxy gateway)
- **Framework**: Fastify 5.x with TypeScript
- **Components**:
  - API server (Fastify with autoload)
  - No database
  - No message queue
  - External services: OpenAI API, Anthropic API

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Gateway                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  Routes  │→ │ Validation│→ │Provider Router│→ │Provider Proxy│ │
│  └──────────┘  └──────────┘  └──────────────┘  └─────────────┘  │
│                                                       │          │
│                                                       ▼          │
│                                              ┌─────────────┐     │
│                                              │ HTTP Client │     │
│                                              │ + Retry     │     │
│                                              │ + Circuit   │     │
│                                              └─────────────┘     │
└───────────────────────────────────┬─────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌──────────┐   ┌──────────┐    ┌──────────┐
              │  OpenAI  │   │Anthropic │    │ Future   │
              │   API    │   │   API    │    │ Provider │
              └──────────┘   └──────────┘    └──────────┘
```

## Folder Structure (ACTUAL - MUST MATCH)

```
src/
├── app.ts                      # Fastify instance + autoload setup
├── config/                     # Configuration constants
│   ├── headers.ts              # Gateway header key constants
│   ├── internal.ts             # Provider credentials from env vars
│   └── provider-mapping.ts     # Route path mappings per provider
├── plugins/                    # Fastify plugins (auto-loaded)
│   ├── cors.ts                 # CORS headers (@fastify/cors)
│   ├── helmet.ts               # Security headers (@fastify/helmet)
│   ├── request-context.ts      # Per-request storage (@fastify/request-context)
│   ├── sensible.ts             # HTTP error utilities (@fastify/sensible)
│   ├── sse.ts                  # Server-Sent Events (@fastify/sse)
│   └── support.ts              # Custom decorators
├── providers/                  # Provider implementations
│   ├── anthropic/
│   │   └── proxy.ts            # Anthropic request/response transformation
│   ├── openai/
│   │   └── proxy.ts            # OpenAI passthrough proxy
│   ├── provider-router.ts      # Routes requests to provider handlers
│   └── registry.ts             # Provider handler registry
├── routes/                     # API routes (auto-loaded by path)
│   ├── root.ts                 # GET / health check
│   └── v1/
│       ├── audio/
│       │   ├── speech.ts       # POST /v1/audio/speech
│       │   ├── transcriptions.ts # POST /v1/audio/transcriptions
│       │   └── translations.ts # POST /v1/audio/translations
│       ├── chat/
│       │   └── completions.ts  # POST /v1/chat/completions
│       ├── completions.ts      # POST /v1/completions
│       ├── embeddings.ts       # POST /v1/embeddings
│       ├── images/
│       │   ├── edits.ts        # POST /v1/images/edits
│       │   └── generations.ts  # POST /v1/images/generations
│       └── models.ts           # GET /v1/models
├── utils/                      # Utility modules
│   ├── circuit-breaker.ts      # Circuit breaker implementation
│   ├── http-client.ts          # HTTP client with retry logic
│   ├── logger.ts               # Global logger utilities
│   └── providers.ts            # Header parsing utilities
└── validation/                 # Request validation
    ├── schemas.ts              # Zod schemas for request bodies
    └── validate.ts             # Validation helper function
```

### Folders NOT Present (Do Not Create)

- `controllers/` - Routes delegate directly to provider-router
- `services/` - Provider proxies handle business logic
- `repositories/` - No database
- `errors/` - Uses @fastify/sensible error methods
- `middleware/` - Uses Fastify plugins pattern instead

## Module Boundaries (STRICT)

| Module | Responsibility | MUST NOT |
|--------|---------------|----------|
| `routes/` | Define endpoints, call validation, delegate to provider-router | Contain business logic, call HTTP client directly |
| `validation/` | Validate request bodies against Zod schemas | Modify request data, call providers |
| `providers/provider-router.ts` | Resolve provider from headers, handle failover loop | Transform requests, make HTTP calls |
| `providers/<name>/proxy.ts` | Transform requests/responses, call HTTP client | Access Fastify request directly (except for headers/body) |
| `utils/http-client.ts` | Make HTTP requests with retry and circuit breaker | Know about providers or transformations |
| `utils/circuit-breaker.ts` | Track failure/success state | Make HTTP calls, know about providers |
| `config/` | Export constants from env vars | Contain logic, throw errors |
| `plugins/` | Register Fastify plugins | Contain route logic |

## Data Flow

### Standard Request Flow

```
HTTP Request
    │
    ▼
┌─────────────────┐
│ Fastify Plugins │  (cors, helmet, sensible, sse, request-context)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Route       │  (routes/v1/chat/completions.ts)
│  - validateJsonBody()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Provider Router │  (providers/provider-router.ts)
│  - resolveProviderFromHeaders()
│  - resolveFailoverProvidersFromHeaders()
│  - loop through providers
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Provider Proxy  │  (providers/openai/proxy.ts or anthropic/proxy.ts)
│  - transformToProvider()
│  - buildTargetUrl()
│  - buildHeaders()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   HTTP Client   │  (utils/http-client.ts)
│  - requestWithRetry()
│  - circuit breaker check
│  - retry loop
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ External API    │  (OpenAI, Anthropic)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Provider Proxy  │
│  - transformToOpenAI() (if needed)
│  - stream handling (if streaming)
└────────┬────────┘
         │
         ▼
HTTP Response
```

### Failover Flow

```
Provider Router
    │
    ├──► Try Provider 1 ──► Success ──► Return Response
    │         │
    │         ▼ (Error/5xx)
    │
    ├──► Try Provider 2 ──► Success ──► Return Response
    │         │
    │         ▼ (Error/5xx)
    │
    └──► Return Last Error (500)
```

## Concurrency Model

| Aspect | Implementation |
|--------|---------------|
| Process model | Single Node.js process |
| Clustering | Not implemented |
| Background jobs | None |
| Async model | async/await with Promises |
| Request handling | Concurrent via event loop |

### Timeouts

| Timeout | Value | Location |
|---------|-------|----------|
| HTTP request timeout | 60,000 ms | `utils/http-client.ts` |
| Retry base delay | 250 ms | `utils/http-client.ts` |
| Retry max delay | 2,000 ms | `utils/http-client.ts` |
| Circuit breaker cooldown | 10,000 ms | `utils/circuit-breaker.ts` |

## Configuration

### Loading Pattern

- All configuration loaded in `src/config/internal.ts`
- Environment variables read via `process.env`
- Default values provided inline
- No validation at startup (checked at request time)

### Config Module Structure

```typescript
// src/config/internal.ts
export const INTERNAL_PROVIDER_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    organization: process.env.OPENAI_ORGANIZATION ?? '',
    project: process.env.OPENAI_PROJECT ?? '',
    beta: process.env.OPENAI_BETA ?? '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    baseUrl: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1',
    version: process.env.ANTHROPIC_VERSION ?? '2023-06-01',
    beta: process.env.ANTHROPIC_BETA ?? 'messages-2023-12-15',
  },
}
```

### Environment Variables

Defined in `docs/09_RUNBOOK.md`. All accessed via `src/config/internal.ts`.

## State Management

### In-Memory State

| State | Scope | Location |
|-------|-------|----------|
| Circuit breaker status | Per-provider, process lifetime | `utils/circuit-breaker.ts` |
| Global logger | Process lifetime | `utils/logger.ts` |

### No Persistent State

- No database connections
- No session storage
- No file-based state

## Forbidden

| Rule | Rationale |
|------|-----------|
| No global mutable state for app data | Prevents race conditions, enables future scaling |
| No direct `process.env` outside `config/` | Centralizes configuration, enables testing |
| No `console.log` | Use Fastify logger (`request.log` or global logger) |
| No synchronous I/O in request handlers | Blocks event loop |
| No circular imports between modules | Causes initialization issues |
| No modifying `request.body` after validation | Validation returns parsed data |

## Extension Points

### Adding a New Provider

1. Create `src/providers/<name>/proxy.ts` with handler function
2. Add config to `src/config/internal.ts`
3. Add path mappings to `src/config/provider-mapping.ts`
4. Register in `src/providers/registry.ts`

### Adding a New Route

1. Create file in `src/routes/v1/<path>.ts`
2. Add Zod schema to `src/validation/schemas.ts`
3. Use `validateJsonBody()` and `handleProviderRequest()`

### Adding a New Plugin

1. Create file in `src/plugins/<name>.ts`
2. Export default using `fastify-plugin` wrapper
3. Auto-loaded by `@fastify/autoload`

---

**Document Version:** 1.0.0  
**Based on:** Codebase structure as implemented
