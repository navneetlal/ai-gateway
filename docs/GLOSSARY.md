# Glossary

## Rules

- Terms defined here are authoritative
- If a term is used in specs and not defined, add it here and/or to `OPEN_QUESTIONS.md`

---

## Terms

### API Gateway
- A server that acts as an intermediary between clients and backend services
- In this project: Routes LLM requests to provider APIs (OpenAI, Anthropic)

### Circuit Breaker
- A resilience pattern that prevents cascading failures by stopping requests to unhealthy services
- **States:**
  - **Closed:** Normal operation, requests pass through
  - **Open:** Requests fail immediately (during cooldown period)
  - **Half-Open:** Limited test requests allowed to check recovery
- **Implementation:** `src/utils/circuit-breaker.ts`

### Cooldown Period
- The time a circuit breaker remains in the open state before transitioning to half-open
- **Default value:** 10,000 ms (10 seconds)
- **Configuration:** `cooldownMs` in `CircuitBreakerConfig`

### Correlation ID / Request ID
- A unique identifier for each incoming request used for tracing logs across systems
- **Status:** NOT implemented in current codebase
- **See:** `docs/OPEN_QUESTIONS.md` Q3

### Exponential Backoff
- A retry strategy where wait time increases exponentially between attempts
- **Formula:** `min(maxDelay, baseDelay * 2^attempt) + jitter`
- **Implementation:** `src/utils/http-client.ts`

### Failover
- Automatic switching to a backup provider when the primary provider fails
- **Trigger:** Network errors, timeouts, 5xx responses, circuit breaker open
- **Header:** `x-aigateway-failover`
- **Implementation:** `src/providers/provider-router.ts`

### Fastify
- The web framework used by this project (version 5.x)
- **Documentation:** https://fastify.dev

### Fastify Plugin
- A reusable module that extends Fastify functionality
- **Location:** `src/plugins/`
- **Pattern:** Uses `fastify-plugin` wrapper for encapsulation

### Gateway Headers
- Custom HTTP headers used to control gateway behavior
- **Headers:**
  - `x-aigateway-provider`: Select provider
  - `x-aigateway-config`: JSON configuration
  - `x-aigateway-failover`: Failover providers
  - `x-aigateway-provider-used`: Response header indicating provider used

### Half-Open State
- Circuit breaker state that allows limited test requests to check if a service has recovered
- **Max attempts:** 3 (configurable via `halfOpenMaxAttempts`)

### Hop-by-Hop Headers
- HTTP headers that are not forwarded by proxies
- **Examples:** `connection`, `transfer-encoding`, `content-length`, `host`
- **Stripped by:** `src/utils/providers.ts`, `src/providers/openai/proxy.ts`

### Jitter
- Random variation added to retry delays to prevent thundering herd
- **Implementation:** 20% of base delay
- **Purpose:** Prevents synchronized retries from multiple clients

### ky
- The HTTP client library used for making requests to providers
- **Documentation:** https://github.com/sindresorhus/ky

### Message
- A single turn in a conversation (system, user, assistant, or tool message)
- **Format:** OpenAI message format (role + content)

### Multimodal
- Content that includes multiple types (text, images, files)
- **Support:** Images via `image_url` content type, files via `file` content type

### OpenAI-Compatible
- API format that follows OpenAI's API specification
- **Routes:** `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, etc.

### Passthrough
- Forwarding requests/responses without transformation
- **Used for:** OpenAI requests (no transformation needed)

### Pino
- The logging library used by Fastify
- **Pretty mode:** `pino-pretty` for development
- **JSON mode:** Raw JSON for production

### Provider
- An LLM service backend (OpenAI, Anthropic)
- **Registry:** `src/providers/registry.ts`
- **Handlers:** `src/providers/<name>/proxy.ts`

### Provider Proxy
- A handler function that routes requests to a specific provider
- **Signature:** `(request: FastifyRequest, reply: FastifyReply, path: string) => Promise<void>`

### Provider Router
- The module that selects and routes requests to provider handlers
- **Location:** `src/providers/provider-router.ts`
- **Responsibilities:** Provider selection, failover orchestration

### Response Envelope
- A standard JSON wrapper for API responses
- **Success format:** `{ "data": <payload>, "error": null }`
- **Error format:** `{ "data": null, "error": { "code": "...", "message": "...", "details": {} } }`
- **Status:** NOT implemented in current codebase (uses passthrough)

### Retry
- Automatic re-attempt of failed requests
- **Default retries:** 2
- **Retryable status codes:** 408, 409, 425, 429, 500, 502, 503, 504
- **Implementation:** `src/utils/http-client.ts`

### SSE (Server-Sent Events)
- A protocol for streaming data from server to client
- **Format:** `data: <JSON>\n\n`
- **Termination:** `data: [DONE]\n\n`
- **Plugin:** `@fastify/sse`

### Stop Reason / Finish Reason
- The reason a completion stopped generating
- **Values:** `stop`, `length`, `tool_calls`
- **Mapping:** Anthropic `stop_reason` → OpenAI `finish_reason`

### Streaming
- Incremental delivery of response content via SSE
- **Enabled by:** `"stream": true` in request body
- **Chunks:** `chat.completion.chunk` objects

### Tool Calling / Function Calling
- LLM capability to invoke external functions
- **Request format:** `tools` array with function definitions
- **Response format:** `tool_calls` in assistant message
- **Transformation:** OpenAI ↔ Anthropic format conversion

### Transformation
- Converting request/response format between gateway and provider
- **OpenAI:** No transformation (passthrough)
- **Anthropic:** Full transformation in `src/providers/anthropic/proxy.ts`

### Zod
- The schema validation library used for request validation
- **Documentation:** https://zod.dev
- **Schemas:** `src/validation/schemas.ts`

---

## Abbreviations

| Abbreviation | Meaning |
|--------------|---------|
| API | Application Programming Interface |
| CLI | Command Line Interface |
| CORS | Cross-Origin Resource Sharing |
| LLM | Large Language Model |
| SSE | Server-Sent Events |
| TTS | Text-to-Speech |
| URI | Uniform Resource Identifier |
| URL | Uniform Resource Locator |

---

**Document Version:** 1.0.0
