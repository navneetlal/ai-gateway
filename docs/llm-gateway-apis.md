# LLM Gateway API Surface

This document lists the HTTP and WebSocket endpoints exposed by the
TypeScript `llm-gateway` reference implementation. Use it as the target
API surface for building `ai-gateway`.

## Base Routes

- `GET /` - Health/hello message ("AI Gateway says hey!").
- `GET /v1/models` - Lists supported models; proxies to control-plane models
  when no provider/config/virtual key is supplied.

## Core OpenAI-Compatible APIs

- `POST /v1/chat/completions` - Chat LLM completion (JSON body).
- `POST /v1/completions` - Text completion (JSON body).
- `POST /v1/embeddings` - Embeddings generation (JSON body).
- `POST /v1/images/generations` - Image generation (JSON body).
- `POST /v1/images/edits` - Image edit/inpaint (multipart form-data).
- `POST /v1/audio/speech` - Text-to-speech (JSON body).
- `POST /v1/audio/transcriptions` - Speech-to-text (multipart form-data).
- `POST /v1/audio/translations` - Speech translation (multipart form-data).

## Anthropic-Compatible APIs

- `POST /v1/messages` - Anthropic messages (JSON body).
- `POST /v1/messages/count_tokens` - Token counting for messages (JSON body).

## Files API

- ~~`GET /v1/files` - List files.~~ *(not required)*
- ~~`GET /v1/files/:id` - Retrieve file metadata.~~ *(not required)*
- ~~`GET /v1/files/:id/content` - Retrieve file content/bytes.~~ *(not required)*
- ~~`POST /v1/files` - Upload a file (streamed body).~~ *(not required)*
- ~~`DELETE /v1/files/:id` - Delete file.~~ *(not required)*

## Batches API

- ~~`POST /v1/batches` - Create a batch job (JSON body).~~ *(not required)*
- ~~`GET /v1/batches` - List batch jobs.~~ *(not required)*
- ~~`GET /v1/batches/:id` - Retrieve a batch job.~~ *(not required)*
- ~~`GET /v1/batches/*/output` - Retrieve batch output.~~ *(not required)*
- ~~`POST /v1/batches/:id/cancel` - Cancel a batch job.~~ *(not required)*

## Responses API

- ~~`POST /v1/responses` - Create a model response (JSON body).~~ *(not required)*
- ~~`GET /v1/responses/:id` - Retrieve a response.~~ *(not required)*
- ~~`DELETE /v1/responses/:id` - Delete a response.~~ *(not required)*
- ~~`GET /v1/responses/:id/input_items` - List input items for a response.~~ *(not required)*

## Fine-Tuning API

- ~~`ALL /v1/fine_tuning/jobs/:jobId?/:cancel?` - Create/list/retrieve/cancel
  fine-tuning jobs based on HTTP method and params.~~ *(not required)*

## Prompt Completions Proxy

- ~~`POST /v1/prompts/*` - Routes prompt paths into completions handlers.~~
  *(not required)*
  - If the request path ends with `/v1/chat/completions`, it routes to the
    chat completions handler.
  - If the request path ends with `/v1/completions`, it routes to the
    completions handler.

## Realtime (WebSocket)

- ~~`GET /v1/realtime` (WebSocket upgrade) - Proxies realtime events to a
  provider's WebSocket endpoint.~~ *(not required)*
  - In `workerd`, handled by `realtimeHandler`.
  - In `node`, handled by `realtimeHandlerNode`.

## Proxy Fallbacks

- ~~`POST /v1/proxy/*` (deprecated) - Explicit proxy passthrough.~~
  *(not required)*
- ~~`POST /v1/*` - Catch-all proxy for v1 POST requests.~~ *(not required)*
- ~~`GET /v1/:path{(?!realtime).*}` - Catch-all proxy for v1 GET requests.~~
  *(not required)*
- ~~`DELETE /v1/*` - Catch-all proxy for v1 DELETE requests.~~ *(not required)*

## Local Console (non-production, non-headless)

These endpoints are enabled only when running the Node server without
`--headless` and not in production:

- `GET /public/` - Gateway Console UI.
- `GET /public` - Redirects to `/public/`.
- `GET /public/logs` - UI route for logs.
- `GET /log/stream` - Server-Sent Events log stream.

## Business Logic Details (per API surface)

### Common request pipeline (all /v1 APIs)

- Validates content-type is JSON/multipart/audio and requires either
  `x-portkey-config` or `x-portkey-provider` headers.
- Validates `x-portkey-provider` against a known provider list.
- Validates `x-portkey-custom-host` with SSRF protection (blocked schemes,
  metadata IPs, private ranges, local TLDs, obfuscated IP formats).
- Validates `x-portkey-config` JSON against the config schema; rejects legacy
  config `options` format.
- Builds provider config from headers (provider credentials, routing, guardrails,
  overrides, and provider-specific fields).
- Applies hook infrastructure (guardrails/mutators) via before/after request
  hooks, with support for async hooks and deny-on-fail logic.
- Supports in-memory cache for non-streaming requests (`cacheMode: simple`),
  with cache refresh header and TTL handling.
- Applies request pre-validation (e.g., virtual key budgets) before sending
  upstream requests.
- Uses retry logic with configurable attempts, status-code triggers, timeouts,
  and retry-after support.
- Maps provider responses back to gateway response format and runs after-request
  hooks before returning.
- Logs request/response metadata and emits logs to the local console SSE stream.

### Routing and provider selection (core for most APIs)

- Accepts config from `x-portkey-config` or headers; merges defaults and
  provider-specific headers into the config.
- Supports routing strategies:
  - `fallback` - sequentially tries targets until success or non-retriable.
  - `loadbalance` - weighted random selection among targets.
  - `conditional` - routes based on metadata, params, and URL.
  - `single` - selects the first target.
- Applies circuit-breaker logic when target groups are used.
- Supports input/output guardrails and mutators at target and default levels,
  including sequential and parallel execution.
- For proxy endpoints, forwards most incoming headers (excluding
  `x-portkey-*` and ignored headers) to the provider.

### Core OpenAI-compatible APIs

- `POST /v1/chat/completions`
  - Parses JSON body and routes to providers as `chatComplete`.
- `POST /v1/completions`
  - Parses JSON body and routes to providers as `complete`.
- `POST /v1/embeddings`
  - Parses JSON body and routes to providers as `embed`.
- `POST /v1/images/generations`
  - Parses JSON body and routes to providers as `imageGenerate`.
- `POST /v1/images/edits`
  - Parses multipart form-data and routes to providers as `imageEdit`.
- `POST /v1/audio/speech`
  - Parses JSON body and routes to providers as `createSpeech`.
- `POST /v1/audio/transcriptions`
  - Parses multipart form-data and routes to providers as `createTranscription`.
- `POST /v1/audio/translations`
  - Parses multipart form-data and routes to providers as `createTranslation`.

### Models API

- `GET /v1/models`
  - If a provider/config/virtual key is present, it falls through to the
    standard gateway routing for models.
  - If not, it proxies to the control-plane models endpoint using
    `ALBUS_BASEPATH`, translating `/v1/models` to `/v2/models` and passing the
    gateway API key.

### Anthropic-compatible APIs

- `POST /v1/messages`
  - Parses JSON body and routes to providers as `messages`.
- `POST /v1/messages/count_tokens`
  - Parses JSON body and routes to providers as `messagesCountTokens`.

### Files API

- Each file route maps directly to a provider endpoint:
  - `listFiles`, `retrieveFile`, `retrieveFileContent`, `uploadFile`,
    `deleteFile`.
- Uploads stream the raw body to the provider (no JSON parsing).

### Batches API

- `createBatch` parses JSON; other batch routes send empty bodies.
- Routes to providers for `createBatch`, `listBatches`, `retrieveBatch`,
  `getBatchOutput`, and `cancelBatch`.

### Responses API

- `createModelResponse` parses JSON; retrieval/delete endpoints send empty body.
- Routes to providers for response creation, lookup, deletion, and input items.

### Fine-Tuning API

- `GET /v1/fine_tuning/jobs` → `listFinetunes`
- `GET /v1/fine_tuning/jobs/:jobId` → `retrieveFinetune`
- `POST /v1/fine_tuning/jobs` → `createFinetune`
- `POST /v1/fine_tuning/jobs/:jobId/cancel` → `cancelFinetune`

### Prompt Completions Proxy

- `POST /v1/prompts/*` routes to `/v1/chat/completions` or `/v1/completions`
  based on the trailing path.

### Realtime (WebSocket)

- Builds provider-specific WebSocket URL and headers.
- Opens an outbound WebSocket to the provider and bridges events between
  client and provider.
- Parses realtime events for internal telemetry processing.

### Proxy Fallbacks

- Parses JSON, multipart form-data, or audio bodies based on `content-type`.
- Routes any other `/v1/*` paths to providers using the same routing pipeline.

### Local Console

- Serves `/public/` UI in non-production, non-headless Node mode.
- Streams logs to `/log/stream` using Server-Sent Events with heartbeats.
