# Security Requirements

## Rules (MUST FOLLOW)

- Never commit secrets to the repository
- Never log secrets
- Validate all inputs (path, query, body)
- Reject requests that violate constraints defined in `docs/03_API_SPEC.md` and `docs/04_DATA_MODEL.md`

---

## Secrets and Configuration

### Implementation
- Secrets provided via environment variables only
- Configuration loaded in `src/config/internal.ts`
- No `.env` file committed (should be in `.gitignore`)

### Secret Environment Variables
| Variable | Contains |
|----------|----------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |

### Configuration Files
- `.env` - MUST NOT be committed
- `.env.example` - NOT present (see `docs/OPEN_QUESTIONS.md`)

---

## Authentication

| Aspect | Implementation |
|--------|---------------|
| **Type** | None |
| **Credentials location** | N/A |
| **Gateway-level auth** | Not implemented |
| **Provider auth** | API keys from env vars, added to provider requests |

### Failure Behavior
- No 401 UNAUTHORIZED responses from gateway
- No 403 FORBIDDEN responses from gateway
- Provider authentication errors passed through

---

## Input Handling

| Aspect | Implementation |
|--------|---------------|
| **Unknown fields policy** | Allow (schemas use `.catchall(z.unknown())`) |
| **Max request body size** | Fastify default (1MB) |
| **File uploads** | Allowed (multipart/form-data passed through) |
| **File size constraints** | None at gateway level |
| **File type constraints** | None at gateway level |

### Validation
- JSON bodies validated against Zod schemas
- Multipart requests bypass validation (passed through)
- Query parameters not validated
- Path parameters not validated

---

## HTTP Hardening

### CORS
- **Plugin:** `@fastify/cors` in `src/plugins/cors.ts`
- **Configuration:** Default (all origins allowed)

| Setting | Value |
|---------|-------|
| `allowedOrigins` | `*` (all) |
| `allowedMethods` | All |
| `allowCredentials` | false (default) |

### Security Headers
- **Plugin:** `@fastify/helmet` in `src/plugins/helmet.ts`
- **Configuration:** Default helmet settings

Default headers added:
| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-XSS-Protection` | `0` |
| `Strict-Transport-Security` | (if HTTPS) |
| `X-DNS-Prefetch-Control` | `off` |
| `X-Download-Options` | `noopen` |
| `X-Permitted-Cross-Domain-Policies` | `none` |

### Rate Limiting
- **Enabled:** No
- **Plugin:** Not installed
- **Rules:** None

---

## Header Handling

### Headers Stripped from Proxy Requests
| Header | Reason |
|--------|--------|
| `host` | Hop-by-hop |
| `connection` | Hop-by-hop |
| `content-length` | Hop-by-hop |
| `transfer-encoding` | Hop-by-hop |
| `accept-encoding` | Hop-by-hop |
| `x-aigateway-*` | Internal gateway headers |

**Source:** `src/utils/providers.ts` → `buildProxyHeaders()`

### Headers Stripped from Proxy Responses
| Header | Reason |
|--------|--------|
| `connection` | Hop-by-hop |
| `transfer-encoding` | Hop-by-hop |
| `content-length` | Hop-by-hop |

**Source:** `src/providers/openai/proxy.ts` → `RESPONSE_HOP_BY_HOP_HEADERS`

---

## Logging Redaction Rules

### Current Implementation
- **Redaction:** Not implemented
- **Secrets may appear in:** Error messages, debug logs

### Recommended Redaction (NOT IMPLEMENTED)
These keys SHOULD be redacted but currently ARE NOT:
- `password`
- `token`
- `access_token`
- `refresh_token`
- `api_key`
- `authorization`
- `cookie`
- `set-cookie`
- `x-api-key`

See `docs/OPEN_QUESTIONS.md` for this gap.

---

## Dependency Policy

- No new dependencies unless explicitly allowed in `docs/00_AGENT_CONTRACT.md`
- No execution of shell commands from request input
- Current dependencies vetted and listed in `package.json`

---

## What Is NOT Implemented

| Feature | Status |
|---------|--------|
| Gateway-level authentication | Not implemented |
| Gateway-level authorization | Not implemented |
| Rate limiting | Not implemented |
| Request size limits (custom) | Not implemented |
| IP allowlisting/blocklisting | Not implemented |
| Secret redaction in logs | Not implemented |
| SSRF protection | Not implemented |
| Request body sanitization | Not implemented |
| `.env.example` file | Not present |

---

**Document Version:** 1.0.0  
**Based on:** `src/plugins/*.ts`, `src/utils/providers.ts`, `src/config/internal.ts`
