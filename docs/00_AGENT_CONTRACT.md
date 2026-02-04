# Agent Contract (MUST FOLLOW)

This document defines the binding contract for AI agents working on the AI Gateway codebase. All rules are mandatory.

---

## Order of Operations (MANDATORY)

1. Read ALL files in `/docs` in numeric order.
2. If any requirement is missing or ambiguous: **DO NOT GUESS.**
   - Add it to `docs/OPEN_QUESTIONS.md`.
   - Implement the smallest safe behavior that does not assume missing details, OR stop with TODO markers if unsafe.
3. Do not add endpoints, data fields, background jobs, or dependencies not explicitly specified.
4. Do not change folder structure or naming conventions defined in `docs/02_SYSTEM_DESIGN.md`.
5. Any deviation must be documented in `docs/10_CHANGELOG.md` with rationale.

---

## Allowed Dependencies

Only dependencies explicitly listed in `package.json` are allowed.

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@fastify/autoload` | ^6.3.1 | Auto-load plugins and routes |
| `@fastify/cors` | ^11.2.0 | CORS headers |
| `@fastify/helmet` | ^13.0.2 | Security headers |
| `@fastify/request-context` | ^6.2.1 | Per-request context storage |
| `@fastify/sensible` | ^6.0.4 | HTTP error utilities |
| `@fastify/sse` | ^0.4.0 | Server-Sent Events support |
| `fastify` | ^5.7.3 | Web framework |
| `fastify-plugin` | ^5.1.0 | Plugin wrapper utility |
| `ky` | ^1.14.3 | HTTP client |
| `zod` | ^4.3.6 | Schema validation |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/node` | ^24.1.0 | TypeScript types for Node.js |
| `c8` | ^10.1.3 | Code coverage |
| `concurrently` | ^9.2.1 | Run multiple commands |
| `fastify-cli` | ^7.4.1 | CLI for Fastify |
| `fastify-tsconfig` | ^3.0.0 | TypeScript config base |
| `pino-pretty` | ^13.1.3 | Log formatting (dev only) |
| `ts-node` | ^10.9.2 | TypeScript execution |
| `typescript` | ^5.9.3 | TypeScript compiler |

### Dependency Rules

- If something seems necessary but is not listed, log it as a question in `OPEN_QUESTIONS.md`.
- Do not install or suggest installing new packages unless the contract allows it.
- Do not upgrade dependency versions without explicit approval.

---

## Implementation Constraints

| Constraint | Value | Notes |
|------------|-------|-------|
| **Node version** | 18+ | Uses `node:` prefixed imports |
| **Module system** | CommonJS | Compiled from TypeScript to `dist/` |
| **Framework** | Fastify 5.x | Do not switch |
| **Database** | None | No persistence layer implemented |
| **HTTP Client** | ky | Do not switch to axios/fetch directly |
| **Validation** | Zod | Do not switch to Joi/Yup |

### Forbidden Actions

- No hidden features
- No placeholders that pretend to work
- No `any` types without explicit justification
- No synchronous file I/O in request handlers
- No direct `console.log` (use Fastify logger)

---

## Project Structure (Do Not Change)

```
src/
├── app.ts                    # Entry point - do not modify structure
├── config/                   # Configuration files
│   ├── headers.ts            # Header key constants
│   ├── internal.ts           # Provider credentials
│   └── provider-mapping.ts   # Route path mappings
├── plugins/                  # Fastify plugins (auto-loaded)
├── providers/                # Provider implementations
│   ├── <provider>/
│   │   └── proxy.ts          # Provider-specific logic
│   ├── provider-router.ts    # Request routing
│   └── registry.ts           # Provider registry
├── routes/                   # API routes (auto-loaded)
│   ├── root.ts
│   └── v1/
├── utils/                    # Utility functions
└── validation/               # Request validation
```

---

## Current Implementation Status

### Providers

| Provider | Status | Supported Routes |
|----------|--------|------------------|
| OpenAI | Implemented | All `/v1/*` routes |
| Anthropic | Implemented | `/v1/chat/completions` only |

### Routes

| Route | Method | Implemented | Validation |
|-------|--------|-------------|------------|
| `/` | GET | Yes | None |
| `/v1/models` | GET | Yes | None |
| `/v1/chat/completions` | POST | Yes | `chatCompletionsSchema` |
| `/v1/completions` | POST | Yes | `completionsSchema` |
| `/v1/embeddings` | POST | Yes | `embeddingsSchema` |
| `/v1/images/generations` | POST | Yes | `imageGenerationsSchema` |
| `/v1/images/edits` | POST | Yes | `imageEditsSchema` |
| `/v1/audio/speech` | POST | Yes | `audioSpeechSchema` |
| `/v1/audio/transcriptions` | POST | Yes | `audioTranscriptionsSchema` |
| `/v1/audio/translations` | POST | Yes | `audioTranslationsSchema` |

### Features

| Feature | Implemented | Location |
|---------|-------------|----------|
| Provider selection via header | Yes | `x-aigateway-provider` |
| Provider selection via JSON config | Yes | `x-aigateway-config` |
| Provider failover | Yes | `x-aigateway-failover` |
| Circuit breaker | Yes | `src/utils/circuit-breaker.ts` |
| Automatic retries | Yes | `src/utils/http-client.ts` |
| Streaming (SSE) | Yes | Anthropic proxy |
| Request validation | Yes | Zod schemas |
| OpenAI→Anthropic transformation | Yes | `src/providers/anthropic/proxy.ts` |

### NOT Implemented

- Authentication/authorization at gateway level
- Rate limiting
- Request/response logging to external systems
- Metrics collection (Prometheus, etc.)
- WebSocket/realtime endpoints
- Files API, Batches API, Fine-tuning API
- Caching
- Database persistence
- Multi-tenancy

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes* | - | OpenAI API key |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI base URL |
| `OPENAI_ORGANIZATION` | No | - | OpenAI organization ID |
| `OPENAI_PROJECT` | No | - | OpenAI project ID |
| `OPENAI_BETA` | No | - | OpenAI beta features |
| `ANTHROPIC_API_KEY` | Yes* | - | Anthropic API key |
| `ANTHROPIC_BASE_URL` | No | `https://api.anthropic.com/v1` | Anthropic base URL |
| `ANTHROPIC_VERSION` | No | `2023-06-01` | Anthropic API version |
| `ANTHROPIC_BETA` | No | `messages-2023-12-15` | Anthropic beta features |
| `LOG_LEVEL` | No | `info` | Log level (trace/debug/info/warn/error/fatal) |
| `NODE_ENV` | No | - | Environment (production disables pino-pretty) |

*Required if using that provider

---

## Custom Headers

| Header | Direction | Purpose |
|--------|-----------|---------|
| `x-aigateway-provider` | Request | Select provider (`openai`, `anthropic`) |
| `x-aigateway-config` | Request | JSON config with `{"provider": "..."}` |
| `x-aigateway-failover` | Request | Comma-separated fallback providers |
| `x-aigateway-provider-used` | Response | Which provider handled the request |

---

## Definition of Done

For any change to be considered complete:

- [ ] All behaviors match `docs/03_API_SPEC.md` and `docs/04_DATA_MODEL.md`
- [ ] Error responses match `docs/05_ERROR_HANDLING.md` exactly
- [ ] Security rules follow `docs/06_SECURITY.md`
- [ ] Logs/metrics follow `docs/07_OBSERVABILITY.md`
- [ ] Tests cover all endpoints as per `docs/08_TEST_PLAN.md`
- [ ] README includes run steps + env vars (mirrors `docs/09_RUNBOOK.md`)
- [ ] TypeScript compiles without errors (`yarn build:ts`)
- [ ] No new linter warnings introduced

---

## Strictness Clause

If there is a conflict between docs files, priority order is:

1. `00_AGENT_CONTRACT.md` (this file)
2. `03_API_SPEC.md`
3. `04_DATA_MODEL.md`
4. `05_ERROR_HANDLING.md`
5. `06_SECURITY.md`
6. `02_SYSTEM_DESIGN.md`
7. Others

---

## Version

- **Document Version:** 1.0.0
- **Project Version:** 0.0.1 (Beta)
- **Last Updated:** Based on codebase as of current state
