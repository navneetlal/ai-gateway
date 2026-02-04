# Product Requirements

## Goal

Provide a unified API gateway that routes LLM requests to multiple providers (OpenAI, Anthropic) through a single OpenAI-compatible API interface with automatic failover and resilience features.

## Users

- **Application Developers**: Need a single API endpoint to access multiple LLM providers without changing client code
- **Platform Engineers**: Need provider abstraction to switch providers or add failover without application changes
- **DevOps Teams**: Need resilient request handling with automatic retries and circuit breaker protection

## In Scope

- OpenAI-compatible REST API endpoints for LLM operations
- Provider routing via request headers
- Request/response transformation between OpenAI and Anthropic formats
- Server-Sent Events (SSE) streaming for chat completions
- Automatic provider failover on failure
- Circuit breaker pattern for provider health management
- Exponential backoff retry logic
- Request body validation using Zod schemas
- Structured JSON logging with configurable levels

## Out of Scope (MUST NOT IMPLEMENT)

- API key authentication/authorization at gateway level
- Rate limiting or quota management
- Request/response caching
- Metrics export (Prometheus, StatsD, etc.)
- WebSocket or realtime endpoints
- Files API (`/v1/files/*`)
- Batches API (`/v1/batches/*`)
- Fine-tuning API (`/v1/fine_tuning/*`)
- Responses API (`/v1/responses/*`)
- Database persistence
- Multi-tenancy or workspace isolation
- Admin UI or dashboard
- Provider credential management (stored in env vars only)

## Functional Requirements

### FR-1: Provider Routing
The gateway MUST route requests to the correct provider based on:
- `x-aigateway-provider` header (e.g., `openai`, `anthropic`)
- `x-aigateway-config` header with JSON `{"provider": "..."}` 
- Default to `openai` if no provider specified

### FR-2: OpenAI API Compatibility
The gateway MUST expose these OpenAI-compatible endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/v1/models` | GET | List models |
| `/v1/chat/completions` | POST | Chat completion |
| `/v1/completions` | POST | Text completion |
| `/v1/embeddings` | POST | Generate embeddings |
| `/v1/images/generations` | POST | Generate images |
| `/v1/images/edits` | POST | Edit images |
| `/v1/audio/speech` | POST | Text to speech |
| `/v1/audio/transcriptions` | POST | Speech to text |
| `/v1/audio/translations` | POST | Audio translation |

### FR-3: Anthropic Transformation
When routing to Anthropic, the gateway MUST:
- Transform OpenAI message format to Anthropic format
- Extract system messages to Anthropic's `system` field
- Convert `tool_calls` to Anthropic's `tool_use` blocks
- Convert `tools` array to Anthropic's tool schema format
- Map `stop` parameter to `stop_sequences`
- Transform Anthropic responses back to OpenAI format
- Map Anthropic stop reasons to OpenAI `finish_reason`

### FR-4: Streaming Support
The gateway MUST support SSE streaming for `/v1/chat/completions`:
- Pass through OpenAI streaming responses unchanged
- Transform Anthropic streaming events to OpenAI chunk format
- Send `data: [DONE]` to signal stream completion

### FR-5: Provider Failover
The gateway MUST support automatic failover:
- Accept `x-aigateway-failover` header with comma-separated providers
- Try primary provider first
- On failure (network error, timeout, 5xx), try next provider in list
- Set `x-aigateway-provider-used` response header to indicate which provider handled the request

### FR-6: Request Validation
The gateway MUST validate JSON request bodies:
- `/v1/chat/completions`: Require `model` (string) and `messages` (array with min 1 item)
- `/v1/completions`: Require `model` (string)
- `/v1/embeddings`: Require `model` (string) and `input` (string/array)
- `/v1/images/generations`: Require `prompt` (string)
- `/v1/audio/speech`: Require `model`, `input`, and `voice` (all strings)
- Allow additional fields (passthrough)
- Skip validation for `multipart/form-data` requests

### FR-7: Anthropic Route Restriction
When using Anthropic provider, the gateway MUST:
- Only allow `/v1/chat/completions` endpoint
- Return 400 error for all other endpoints

## Non-Functional Requirements

### Performance

| Metric | Value | Source |
|--------|-------|--------|
| Request timeout | 60 seconds | `http-client.ts` |
| Retry base delay | 250ms | `http-client.ts` |
| Retry max delay | 2000ms | `http-client.ts` |
| Max retries | 2 | `http-client.ts` |
| Retry jitter | 20% of delay | `http-client.ts` |

### Reliability

| Metric | Value | Source |
|--------|-------|--------|
| Circuit breaker failure threshold | 5 consecutive failures | `circuit-breaker.ts` |
| Circuit breaker cooldown | 10 seconds | `circuit-breaker.ts` |
| Circuit breaker success threshold | 2 consecutive successes | `circuit-breaker.ts` |
| Half-open max attempts | 3 | `circuit-breaker.ts` |
| Retryable status codes | 408, 409, 425, 429, 500, 502, 503, 504 | `http-client.ts` |

### Compatibility

| Requirement | Value |
|-------------|-------|
| Node.js version | 18+ |
| API format | OpenAI-compatible |
| Streaming format | Server-Sent Events (SSE) |
| Content types | `application/json`, `multipart/form-data` |

### Compliance

- No compliance requirements implemented
- No data retention policies
- No audit logging

## Assumptions (EXPLICIT)

- Provider API keys are configured via environment variables before startup
- At least one provider API key (OpenAI or Anthropic) is configured
- Upstream providers (OpenAI, Anthropic) are accessible from the gateway
- Clients handle SSE streaming format correctly
- Request bodies fit in memory (no streaming request body handling for JSON)
- Single instance deployment (circuit breaker state is in-memory, not shared)
- All timestamps use server clock (no client time synchronization)
- UTF-8 encoding for all text content

---

**Document Version:** 1.0.0  
**Based on:** Codebase analysis (src/*, package.json, README.md)
