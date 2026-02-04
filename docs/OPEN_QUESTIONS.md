# Open Questions (Agent MUST use this instead of guessing)

## Rules

- If anything is ambiguous or missing, it must be added here
- Do not invent answers. Do not assume defaults.
- Each question must include why it matters

---

## Questions

### Q1: Response Envelope Format
- **Question:** Should the gateway use a standard response envelope `{ data, error }` instead of passing through provider responses?
- **Why needed:** Current implementation passes provider responses unchanged, but template suggests envelope format. Affects client parsing logic.
- **Options:**
  - A) Keep passthrough (current implementation)
  - B) Wrap all responses in envelope format
- **Current behavior:** Passthrough for success, `@fastify/sensible` format for errors

### Q2: Error Code Standardization
- **Question:** Should gateway define custom error codes (e.g., `VALIDATION_ERROR`, `PROVIDER_ERROR`) instead of using HTTP status codes only?
- **Why needed:** Template defines error codes but implementation uses raw HTTP status codes. Affects client error handling.
- **Options:**
  - A) Keep HTTP status codes only (current)
  - B) Add custom error code field to all errors
- **Current behavior:** HTTP status codes with message strings

### Q3: Correlation ID / Request ID
- **Question:** Should the gateway generate and propagate correlation IDs for request tracing?
- **Why needed:** Important for debugging and log correlation in distributed systems. Template requires it.
- **Options:**
  - A) Accept `X-Request-Id` header, generate if missing, include in logs and response
  - B) Do not implement (current)
- **Current behavior:** Not implemented

### Q4: Secret Redaction in Logs
- **Question:** Should API keys and sensitive data be redacted from logs?
- **Why needed:** Security concern - API keys could appear in error messages or debug logs. Template requires redaction.
- **Options:**
  - A) Implement pino redaction for sensitive fields
  - B) Do not implement (current)
- **Current behavior:** No redaction implemented

### Q5: Startup Validation
- **Question:** Should the app fail fast on startup if required environment variables are missing?
- **Why needed:** Template requires fail-fast behavior. Currently, missing API keys cause 500 errors at request time.
- **Options:**
  - A) Validate env vars on startup, exit if missing
  - B) Check at request time (current)
- **Current behavior:** Checked at request time, returns 500

### Q6: .env.example File
- **Question:** Should a `.env.example` file be created with safe dummy values?
- **Why needed:** Template requires it for developer onboarding.
- **Options:**
  - A) Create `.env.example` with placeholder values
  - B) Document in README only (current)
- **Current behavior:** Not present

### Q7: CORS Configuration
- **Question:** What CORS settings should be used in production?
- **Why needed:** Current config allows all origins, which may not be suitable for production.
- **Options:**
  - A) Keep default (all origins allowed)
  - B) Configure specific allowed origins via env var
- **Current behavior:** `@fastify/cors` with defaults (all origins)

### Q8: Rate Limiting
- **Question:** Should rate limiting be implemented?
- **Why needed:** Listed in "Out of Scope" but template includes it. Protects against abuse.
- **Options:**
  - A) Implement with `@fastify/rate-limit`
  - B) Do not implement (current - documented as out of scope)
- **Current behavior:** Not implemented

### Q9: Port Configuration
- **Question:** Should server port be configurable via environment variable?
- **Why needed:** Common requirement for containerized deployments.
- **Options:**
  - A) Add `PORT` env var support
  - B) Keep Fastify CLI default (3000)
- **Current behavior:** Fixed at 3000 (Fastify CLI default)

### Q10: Health Check Response Format
- **Question:** Should health check return JSON instead of plain text?
- **Why needed:** Template shows JSON format `{ data: { status: "ok" }, error: null }`, but current returns plain text.
- **Options:**
  - A) Change to JSON format
  - B) Keep plain text (current)
- **Current behavior:** Returns `"All is well!"` as plain text

### Q11: Circuit Breaker State Persistence
- **Question:** Should circuit breaker state be shared across instances?
- **Why needed:** In multi-instance deployments, each instance has its own circuit breaker state.
- **Options:**
  - A) Add Redis/shared storage for circuit breaker state
  - B) Keep in-memory per-instance (current - documented as single instance assumption)
- **Current behavior:** In-memory, not shared

### Q12: Request Duration Logging
- **Question:** Should request duration be logged for all requests?
- **Why needed:** Template requires `durationMs` in logs for performance monitoring.
- **Options:**
  - A) Add request duration to completion logs
  - B) Rely on Fastify default logging (current)
- **Current behavior:** Not explicitly logged

### Q13: Authentication at Gateway Level
- **Question:** Should the gateway implement its own authentication layer?
- **Why needed:** Currently relies on provider API keys only. No gateway-level access control.
- **Options:**
  - A) Add API key authentication for gateway access
  - B) Keep unauthenticated (current - documented as out of scope)
- **Current behavior:** Not implemented, documented as out of scope

---

## Decisions Made

*No decisions have been made yet. This section will be updated as questions are resolved.*

### Template for Decisions

```
- YYYY-MM-DD: [Decision summary] (decided by [name/team])
  - Question: Q[N]
  - Choice: [Option chosen]
  - Rationale: [Why this option]
```

---

**Document Version:** 1.0.0
