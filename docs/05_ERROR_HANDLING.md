# Error Handling

## Rules (MUST FOLLOW)

- All errors use `@fastify/sensible` HTTP error methods
- Do not invent new error codes. If a code is needed but missing, add it to `docs/OPEN_QUESTIONS.md`
- Do not leak stack traces or internal messages to clients
- All errors are logged via Fastify's request logger

---

## Error Response Shape (ACTUAL IMPLEMENTATION)

**Note:** This gateway does NOT use a custom error envelope. It uses `@fastify/sensible` format.

### Standard Error Response
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Human readable message"
}
```

### Validation Error Response
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": {
    "error": "Invalid request body",
    "details": [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": ["model"],
        "message": "Required"
      }
    ]
  }
}
```

---

## Error Methods Used

| Method | HTTP Status | Usage |
|--------|-------------|-------|
| `reply.badRequest(message)` | 400 | Validation errors, unsupported paths/providers |
| `reply.internalServerError(message)` | 500 | Provider failures, missing API keys |

**Source:** `@fastify/sensible` plugin registered in `src/plugins/sensible.ts`

---

## Error Catalog (Implemented)

### VALIDATION_ERROR
- **HTTP Status:** 400
- **When:** Request body fails Zod schema validation
- **Message:** `{ error: "Invalid request body", details: [...] }`
- **Location:** `src/validation/validate.ts`

### MISSING_BODY
- **HTTP Status:** 400
- **When:** Request body is null/undefined and not allowed
- **Message:** `"Request body required"`
- **Location:** `src/validation/validate.ts`

### UNSUPPORTED_PROVIDER
- **HTTP Status:** 400
- **When:** `x-aigateway-provider` header contains unknown provider
- **Message:** `"Unsupported provider: {name}. Supported: openai, anthropic"`
- **Location:** `src/providers/provider-router.ts`

### UNSUPPORTED_PATH
- **HTTP Status:** 400
- **When:** Anthropic provider receives non-chat-completions request
- **Message:** `"Unsupported anthropic path"`
- **Location:** `src/providers/anthropic/proxy.ts`

### API_KEY_MISSING
- **HTTP Status:** 500
- **When:** Provider API key environment variable is empty
- **Message:** `"OpenAI API key not configured"` or `"Anthropic API key not configured"`
- **Location:** `src/providers/*/proxy.ts`

### PROVIDER_REQUEST_FAILED
- **HTTP Status:** 500
- **When:** HTTP request to provider fails (network error, timeout)
- **Message:** `"{Provider} request failed: {error message}"`
- **Location:** `src/providers/*/proxy.ts`

### ALL_PROVIDERS_FAILED
- **HTTP Status:** 500
- **When:** All providers in failover chain fail
- **Message:** `"All providers failed to process request"` or last error message
- **Location:** `src/providers/provider-router.ts`

### CIRCUIT_BREAKER_OPEN
- **HTTP Status:** 500 (thrown, may trigger failover)
- **When:** Circuit breaker is in open state
- **Message:** `"Circuit open for {provider}"`
- **Location:** `src/utils/http-client.ts`

### PROVIDER_5XX
- **HTTP Status:** Varies (passed through from provider)
- **When:** Upstream provider returns 5xx error
- **Behavior:** If failover configured, triggers failover; otherwise passed through
- **Location:** `src/providers/*/proxy.ts`

---

## Error Flow

### Without Failover
```
Error occurs
    │
    ▼
reply.badRequest() or reply.internalServerError()
    │
    ▼
Response sent to client
```

### With Failover (`x-aigateway-failover` header present)
```
Error occurs
    │
    ▼
throw Error (instead of reply.send)
    │
    ▼
provider-router catches error
    │
    ▼
Try next provider in failover list
    │
    ▼
If all fail: reply.internalServerError(lastError.message)
```

---

## Validation Error Details Format

Validation errors use Zod's issue format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": {
    "error": "Invalid request body",
    "details": [
      {
        "code": "invalid_type",
        "expected": "array",
        "received": "undefined",
        "path": ["messages"],
        "message": "Required"
      },
      {
        "code": "too_small",
        "minimum": 1,
        "type": "array",
        "inclusive": true,
        "exact": false,
        "message": "Array must contain at least 1 element(s)",
        "path": ["messages"]
      }
    ]
  }
}
```

**Source:** `src/validation/validate.ts` → `parsed.error.issues`

---

## Logging Requirements (ACTUAL)

### Log Levels by Status
- **4xx errors:** Logged at `warn` level
- **5xx errors:** Logged at `error` level
- **Debug info:** Logged at `debug` level

### What Is Logged
| Scenario | Level | Fields |
|----------|-------|--------|
| Unsupported provider | warn | `{ provider }` |
| Provider request failed | error | `{ error, path }` |
| Provider 5xx (with failover) | warn | `{ status, path }` |
| All providers failed | error | `{ providers, error }` |
| Failover attempt | info | `{ provider, previousProvider, attempt }` |
| Circuit breaker open | warn | `{ circuit, url }` |
| Retry attempt | debug | `{ attempt, url }` |

### Log Method
- Uses Fastify's `request.log` for request-scoped logging
- Uses global logger (`getLogger()`) for circuit breaker logs

---

## What Is NOT Implemented

- Custom error code catalog (uses HTTP status codes only)
- Correlation ID / Request ID in error responses
- Error response envelope format `{ data, error }`
- Structured error codes like `VALIDATION_ERROR`, `UNAUTHORIZED`
- Redaction of secrets in error messages (see `docs/OPEN_QUESTIONS.md`)

---

**Document Version:** 1.0.0  
**Based on:** `src/validation/validate.ts`, `src/providers/*.ts`, `src/utils/http-client.ts`
