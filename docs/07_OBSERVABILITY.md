# Observability

## Rules (MUST FOLLOW)

- Logs MUST be structured JSON written to stdout
- Sensitive fields SHOULD be redacted (currently NOT implemented - see `docs/06_SECURITY.md`)
- Use Fastify's built-in logger (`request.log` or global logger)

---

## Logging Implementation

### Logger Setup
- **Framework:** Pino (via Fastify)
- **Configuration:** `src/app.ts`
- **Global logger:** `src/utils/logger.ts`

```typescript
// src/app.ts
const options: AppOptions = {
  logger: {
    level: LOG_LEVEL,  // from env var, default 'info'
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
}
```

### Log Levels
| Level | Value | Usage |
|-------|-------|-------|
| `trace` | 10 | Not used |
| `debug` | 20 | Proxy requests, retry attempts |
| `info` | 30 | Successful failovers, circuit breaker state changes |
| `warn` | 40 | Unsupported providers/paths, 5xx triggering failover, circuit breaker open |
| `error` | 50 | Provider request failures, all providers failed |
| `fatal` | 60 | Not used |

---

## Correlation ID

### Current Implementation
- **Incoming header accepted:** None
- **Generation:** Not implemented
- **Response header:** Not added
- **Log field:** Not included

### Status
Correlation ID / Request ID is NOT implemented. See `docs/OPEN_QUESTIONS.md`.

---

## Logging Format

### Development Mode (`NODE_ENV !== 'production'`)
Human-readable format via `pino-pretty`:
```
12:34:56 +0000 INFO: Proxying request to OpenAI
    targetUrl: "https://api.openai.com/v1/chat/completions"
    method: "POST"
    path: "/v1/chat/completions"
```

### Production Mode (`NODE_ENV === 'production'`)
Structured JSON to stdout:
```json
{
  "level": 30,
  "time": 1706961330000,
  "msg": "Proxying request to OpenAI",
  "targetUrl": "https://api.openai.com/v1/chat/completions",
  "method": "POST",
  "path": "/v1/chat/completions"
}
```

---

## Log Events (Implemented)

### Provider Routing
| Event | Level | Fields |
|-------|-------|--------|
| Routing request | debug | `{ provider, failover, path }` |
| Unsupported provider | warn | `{ provider }` |
| Failover attempt | info | `{ provider, previousProvider, attempt }` |
| All providers failed | error | `{ providers, error }` |

### Provider Proxy (OpenAI/Anthropic)
| Event | Level | Fields |
|-------|-------|--------|
| Proxying request | debug | `{ targetUrl, method, path }` |
| Response received | debug | `{ status, path }` |
| Request failed | error | `{ error, path }` |
| 5xx triggering failover | warn | `{ status, path }` |
| Unsupported path | warn | `{ path }` |
| API key missing | error | (none) |
| Streaming response | debug | `{ path }` |

### HTTP Client
| Event | Level | Fields |
|-------|-------|--------|
| Retrying request | debug | `{ attempt, url }` |
| Request succeeded after retry | info | `{ attempt, status, url }` |
| Non-retryable status | debug | `{ status, url }` |
| Failed after all retries | warn/error | `{ attempt, status/error, url }` |

### Circuit Breaker
| Event | Level | Fields |
|-------|-------|--------|
| Circuit breaker open | warn | `{ circuit, url }` |
| Half-open after cooldown | info | `{ circuit }` |
| Circuit breaker opened | warn | `{ circuit, consecutiveFailures, cooldownMs }` |
| Circuit breaker closed | info | `{ circuit }` |

---

## Error Logging

### Log Levels by Status
| Status Code | Log Level |
|-------------|-----------|
| 4xx | warn |
| 5xx | error |

### Error Log Fields
- `error` or `error.message`: Error description
- `path`: Request path
- `status`: HTTP status code (if available)
- `provider`: Provider name (if applicable)
- `attempt`: Retry/failover attempt number (if applicable)

---

## Metrics

### Current Implementation
- **Enabled:** No
- **Metrics endpoint:** None
- **Prometheus integration:** Not implemented
- **StatsD integration:** Not implemented

### Metrics NOT Available
- `request_count_total`
- `request_duration_ms`
- `error_count_total`
- Circuit breaker state metrics
- Provider latency metrics

---

## What Is NOT Implemented

| Feature | Status |
|---------|--------|
| Correlation ID / Request ID | Not implemented |
| Request duration logging | Not implemented |
| Response status logging | Not implemented (Fastify default only) |
| Secret redaction | Not implemented |
| Structured error codes in logs | Not implemented |
| Metrics export | Not implemented |
| Distributed tracing (OpenTelemetry) | Not implemented |
| Log aggregation integration | Not implemented |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum log level |
| `NODE_ENV` | (none) | If not `production`, enables pino-pretty |

---

**Document Version:** 1.0.0  
**Based on:** `src/app.ts`, `src/utils/logger.ts`, `src/providers/*.ts`, `src/utils/*.ts`
