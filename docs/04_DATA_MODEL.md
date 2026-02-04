# Data Model

This document defines the authoritative data structures used in the AI Gateway. Since this is a stateless proxy with no database, entities represent request/response payloads and internal state structures.

---

## Request Entities

### Entity: ChatCompletionRequest

Description: Request body for `/v1/chat/completions` endpoint.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model identifier |
| `messages` | Message[] | Yes | Array of messages (min 1) |
| `stream` | boolean | No | Enable SSE streaming |
| `temperature` | number | No | Sampling temperature |
| `top_p` | number | No | Nucleus sampling |
| `top_k` | number | No | Top-k sampling (Anthropic) |
| `max_tokens` | number | No | Max tokens to generate |
| `max_completion_tokens` | number | No | Alias for max_tokens |
| `stop` | string \| string[] | No | Stop sequences |
| `tools` | Tool[] | No | Available tools |
| `tool_choice` | string \| object | No | Tool selection mode |
| `user` | string | No | End-user identifier |
| `metadata` | object | No | Request metadata |
| `thinking` | object | No | Anthropic thinking mode |
| `anthropic_version` | string | No | Override Anthropic API version |
| `anthropic_beta` | string | No | Override Anthropic beta features |

**Constraints**
- `messages` must have at least 1 item
- Additional fields allowed (passthrough to provider)

**Serialization**
- Input: JSON (`application/json`)
- Validation: `chatCompletionsSchema` in `validation/schemas.ts`

---

### Entity: Message

Description: A single message in the conversation.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | `system`, `user`, `assistant`, or `tool` |
| `content` | string \| ContentPart[] | Yes | Message content |
| `tool_calls` | ToolCall[] | No | Tool calls (assistant only) |
| `tool_call_id` | string | No | Tool call ID (tool role only) |
| `cache_control` | object | No | Anthropic cache control |

**Constraints**
- `role` is required
- `content` is required (can be string or array)
- Additional fields allowed

---

### Entity: ContentPart

Description: A content part within a message (for multimodal).

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | `text`, `image_url`, or `file` |
| `text` | string | Conditional | Text content (if type=text) |
| `image_url` | ImageUrl | Conditional | Image reference (if type=image_url) |
| `file` | FileReference | Conditional | File reference (if type=file) |
| `cache_control` | object | No | Anthropic cache control |

---

### Entity: ImageUrl

Description: Image URL reference in content.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | URL or base64 data URI |

**Constraints**
- `url` can be HTTP URL or `data:` URI
- Supported formats: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `application/pdf`

---

### Entity: FileReference

Description: File reference in content.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file_url` | string | Conditional | URL to file |
| `file_data` | string | Conditional | Base64 file data |
| `mime_type` | string | No | MIME type of file |

---

### Entity: Tool

Description: Tool definition for function calling.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `function` |
| `function` | FunctionDefinition | Yes | Function details |
| `defer_loading` | boolean | No | Anthropic deferred loading |
| `allowed_callers` | string[] | No | Anthropic allowed callers |
| `input_examples` | object[] | No | Anthropic input examples |

---

### Entity: FunctionDefinition

Description: Function definition within a tool.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Function name |
| `description` | string | No | Function description |
| `parameters` | JSONSchema | No | Parameter schema |

---

### Entity: ToolCall

Description: A tool call made by the assistant.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique tool call ID |
| `type` | string | Yes | Must be `function` |
| `function` | FunctionCall | Yes | Function call details |
| `cache_control` | object | No | Anthropic cache control |

---

### Entity: FunctionCall

Description: Function call details.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Function name |
| `arguments` | string | Yes | JSON-encoded arguments |

---

### Entity: CompletionRequest

Description: Request body for `/v1/completions` endpoint.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model identifier |
| `prompt` | string \| string[] \| number[] | No | Input prompt(s) |

**Constraints**
- Additional fields allowed (passthrough)

---

### Entity: EmbeddingRequest

Description: Request body for `/v1/embeddings` endpoint.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model identifier |
| `input` | string \| string[] \| number[] | Yes | Input text(s) |

---

### Entity: ImageGenerationRequest

Description: Request body for `/v1/images/generations` endpoint.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Image description |
| `model` | string | No | Model identifier |

**Constraints**
- Additional fields allowed (passthrough)

---

### Entity: AudioSpeechRequest

Description: Request body for `/v1/audio/speech` endpoint.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model identifier |
| `input` | string | Yes | Text to synthesize |
| `voice` | string | Yes | Voice identifier |

---

## Response Entities

### Entity: ChatCompletionResponse

Description: Response from `/v1/chat/completions` (non-streaming).

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Response identifier |
| `object` | string | Yes | Always `chat.completion` |
| `created` | number | Yes | Unix timestamp |
| `model` | string | Yes | Model used |
| `choices` | Choice[] | Yes | Response choices |
| `usage` | Usage | Yes | Token usage |

**Serialization**
- Output: JSON
- Anthropic responses transformed via `transformToOpenAI()`

---

### Entity: Choice

Description: A completion choice.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `index` | number | Yes | Choice index (always 0) |
| `message` | ResponseMessage | Yes | Generated message |
| `finish_reason` | string \| null | Yes | `stop`, `length`, `tool_calls`, or null |

---

### Entity: ResponseMessage

Description: Assistant's response message.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | Always `assistant` |
| `content` | string | Yes | Text content |
| `tool_calls` | ToolCall[] | No | Tool calls (if any) |

---

### Entity: Usage

Description: Token usage statistics.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt_tokens` | number | Yes | Input tokens |
| `completion_tokens` | number | Yes | Output tokens |
| `total_tokens` | number | Yes | Total tokens |
| `prompt_tokens_details` | object | No | Cached token details |

---

### Entity: ChatCompletionChunk

Description: Streaming chunk for `/v1/chat/completions` with `stream: true`.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Response identifier |
| `object` | string | Yes | Always `chat.completion.chunk` |
| `created` | number | Yes | Unix timestamp |
| `model` | string | Yes | Model used |
| `choices` | ChunkChoice[] | Yes | Chunk choices |

---

### Entity: ChunkChoice

Description: A streaming chunk choice.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `index` | number | Yes | Choice index (always 0) |
| `delta` | Delta | Yes | Incremental content |
| `finish_reason` | string \| null | Yes | `stop`, `length`, `tool_calls`, or null |

---

### Entity: Delta

Description: Incremental content in a streaming chunk.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | No | Role (first chunk only) |
| `content` | string | No | Text content delta |
| `tool_calls` | ToolCallDelta[] | No | Tool call deltas |

---

## Internal State Entities

### Entity: CircuitBreakerSnapshot

Description: Complete state of a circuit breaker instance.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `state` | CircuitBreakerState | Yes | Current state flags |
| `status` | CircuitBreakerStatus | Yes | Statistics |
| `cooldownUntil` | number | No | Timestamp when cooldown ends |
| `warmUpUntil` | number | No | Timestamp when warmup ends |

**Location**: `src/utils/circuit-breaker.ts`

---

### Entity: CircuitBreakerState

Description: State flags for circuit breaker.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | Yes | Whether breaker is enabled |
| `name` | string | Yes | Provider name |
| `closed` | boolean | Yes | Normal operation |
| `open` | boolean | Yes | Failing fast |
| `halfOpen` | boolean | Yes | Testing recovery |
| `warmUp` | boolean | Yes | In warmup period |
| `shutdown` | boolean | Yes | Permanently disabled |

---

### Entity: CircuitBreakerStatus

Description: Statistics for circuit breaker.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `failures` | number | Yes | Total failures |
| `successes` | number | Yes | Total successes |
| `consecutiveFailures` | number | Yes | Consecutive failures |
| `consecutiveSuccesses` | number | Yes | Consecutive successes |
| `openedAt` | number | No | Timestamp when opened |
| `halfOpenAttempts` | number | Yes | Test requests made |
| `lastFailureAt` | number | No | Last failure timestamp |
| `lastSuccessAt` | number | No | Last success timestamp |

---

### Entity: CircuitBreakerConfig

Description: Configuration for circuit breaker.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | - | Provider identifier |
| `enabled` | boolean | No | `true` | Enable circuit breaker |
| `failureThreshold` | number | No | `5` | Failures to open |
| `successThreshold` | number | No | `2` | Successes to close |
| `cooldownMs` | number | No | `10000` | Open state duration |
| `halfOpenMaxAttempts` | number | No | `3` | Test requests allowed |
| `warmUpMs` | number | No | `0` | Initial warmup period |

---

## Configuration Entities

### Entity: ProviderConfig

Description: Provider credential configuration.

**Fields (MUST MATCH EXACTLY)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | Yes | Provider API key |
| `baseUrl` | string | Yes | Provider base URL |
| `organization` | string | No | OpenAI organization (OpenAI only) |
| `project` | string | No | OpenAI project (OpenAI only) |
| `beta` | string | No | Beta features header |
| `version` | string | No | API version (Anthropic only) |

**Location**: `src/config/internal.ts`

---

## Type Mappings

### Anthropic Stop Reason → OpenAI Finish Reason

| Anthropic `stop_reason` | OpenAI `finish_reason` |
|------------------------|----------------------|
| `end_turn` | `stop` |
| `stop_sequence` | `stop` |
| `max_tokens` | `length` |
| `tool_use` | `tool_calls` |

**Location**: `src/providers/anthropic/proxy.ts` → `mapStopReason()`

---

## Validation Schemas

All request validation schemas are defined in `src/validation/schemas.ts` using Zod.

| Schema | Validates | Required Fields |
|--------|-----------|-----------------|
| `chatCompletionsSchema` | ChatCompletionRequest | `model`, `messages` |
| `completionsSchema` | CompletionRequest | `model` |
| `embeddingsSchema` | EmbeddingRequest | `model`, `input` |
| `imageGenerationsSchema` | ImageGenerationRequest | `prompt` |
| `imageEditsSchema` | ImageEditRequest | (none - multipart) |
| `audioSpeechSchema` | AudioSpeechRequest | `model`, `input`, `voice` |
| `audioTranscriptionsSchema` | AudioTranscriptionRequest | (none - multipart) |
| `audioTranslationsSchema` | AudioTranslationRequest | (none - multipart) |

---

**Document Version:** 1.0.0  
**Based on:** `src/validation/schemas.ts`, `src/providers/anthropic/proxy.ts`, `src/utils/circuit-breaker.ts`
