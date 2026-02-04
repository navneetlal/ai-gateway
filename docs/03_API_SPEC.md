# API Specification

This document defines the authoritative API specification for AI Gateway based on the implemented code.

---

## Base URL

```
http://localhost:3000
```

## Response Format

**Note:** This gateway does NOT use a standard response envelope. Responses are passed through from upstream providers or returned directly.

### Success Response
- Provider responses are passed through unchanged (OpenAI format)
- Health check returns plain text

### Error Response (from @fastify/sensible)
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Error description"
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

## Headers

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` or `multipart/form-data` |
| `x-aigateway-provider` | No | Provider selection (`openai`, `anthropic`) |
| `x-aigateway-config` | No | JSON config: `{"provider": "..."}` |
| `x-aigateway-failover` | No | Comma-separated fallback providers |

### Response Headers

| Header | Description |
|--------|-------------|
| `x-aigateway-provider-used` | Which provider handled the request |
| `content-type` | Response content type |

---

## Endpoints

### GET /

Health check endpoint.

**Request**
```
GET /
```

**Response**
```
HTTP/1.1 200 OK
Content-Type: text/plain

All is well!
```

---

### GET /v1/models

List available models from the selected provider.

**Request**
```
GET /v1/models
x-aigateway-provider: openai
```

**Response**
- Proxied from provider (OpenAI format)

**Provider Support**
| Provider | Supported |
|----------|-----------|
| OpenAI | Yes |
| Anthropic | No (returns 400) |

---

### POST /v1/chat/completions

Create a chat completion.

**Request**
```
POST /v1/chat/completions
Content-Type: application/json
x-aigateway-provider: openai

{
  "model": "gpt-4o",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```

**Required Fields**
| Field | Type | Description |
|-------|------|-------------|
| `model` | string | Model identifier |
| `messages` | array | Messages array (min 1) |

**Optional Fields**
| Field | Type | Description |
|-------|------|-------------|
| `stream` | boolean | Enable SSE streaming |
| `temperature` | number | Sampling temperature |
| `max_tokens` | number | Max tokens to generate |
| `tools` | array | Available tools |
| `tool_choice` | string/object | Tool selection mode |
| `stop` | string/array | Stop sequences |

**Response (non-streaming)**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

**Response (streaming)**
```
data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant"}}]}

data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}

data: [DONE]
```

**Provider Support**
| Provider | Supported | Notes |
|----------|-----------|-------|
| OpenAI | Yes | Passthrough |
| Anthropic | Yes | Transformed to/from Anthropic format |

---

### POST /v1/completions

Create a text completion.

**Request**
```
POST /v1/completions
Content-Type: application/json
x-aigateway-provider: openai

{
  "model": "gpt-3.5-turbo-instruct",
  "prompt": "Say hello"
}
```

**Required Fields**
| Field | Type | Description |
|-------|------|-------------|
| `model` | string | Model identifier |

**Optional Fields**
| Field | Type | Description |
|-------|------|-------------|
| `prompt` | string/array | Input prompt(s) |

**Provider Support**
| Provider | Supported |
|----------|-----------|
| OpenAI | Yes |
| Anthropic | No (returns 400) |

---

### POST /v1/embeddings

Generate embeddings for input text.

**Request**
```
POST /v1/embeddings
Content-Type: application/json
x-aigateway-provider: openai

{
  "model": "text-embedding-3-small",
  "input": "Hello world"
}
```

**Required Fields**
| Field | Type | Description |
|-------|------|-------------|
| `model` | string | Model identifier |
| `input` | string/array | Input text(s) |

**Provider Support**
| Provider | Supported |
|----------|-----------|
| OpenAI | Yes |
| Anthropic | No (returns 400) |

---

### POST /v1/images/generations

Generate images from text.

**Request**
```
POST /v1/images/generations
Content-Type: application/json
x-aigateway-provider: openai

{
  "prompt": "A white cat",
  "model": "dall-e-3"
}
```

**Required Fields**
| Field | Type | Description |
|-------|------|-------------|
| `prompt` | string | Image description |

**Optional Fields**
| Field | Type | Description |
|-------|------|-------------|
| `model` | string | Model identifier |

**Provider Support**
| Provider | Supported |
|----------|-----------|
| OpenAI | Yes |
| Anthropic | No (returns 400) |

---

### POST /v1/images/edits

Edit images (multipart form-data).

**Request**
```
POST /v1/images/edits
Content-Type: multipart/form-data
x-aigateway-provider: openai
```

**Validation**
- Allows empty body (multipart)
- Passed through to provider

**Provider Support**
| Provider | Supported |
|----------|-----------|
| OpenAI | Yes |
| Anthropic | No (returns 400) |

---

### POST /v1/audio/speech

Convert text to speech.

**Request**
```
POST /v1/audio/speech
Content-Type: application/json
x-aigateway-provider: openai

{
  "model": "tts-1",
  "input": "Hello world",
  "voice": "alloy"
}
```

**Required Fields**
| Field | Type | Description |
|-------|------|-------------|
| `model` | string | Model identifier |
| `input` | string | Text to synthesize |
| `voice` | string | Voice identifier |

**Provider Support**
| Provider | Supported |
|----------|-----------|
| OpenAI | Yes |
| Anthropic | No (returns 400) |

---

### POST /v1/audio/transcriptions

Transcribe audio to text (multipart form-data).

**Request**
```
POST /v1/audio/transcriptions
Content-Type: multipart/form-data
x-aigateway-provider: openai
```

**Validation**
- Allows empty body (multipart)
- Passed through to provider

**Provider Support**
| Provider | Supported |
|----------|-----------|
| OpenAI | Yes |
| Anthropic | No (returns 400) |

---

### POST /v1/audio/translations

Translate audio to English text (multipart form-data).

**Request**
```
POST /v1/audio/translations
Content-Type: multipart/form-data
x-aigateway-provider: openai
```

**Validation**
- Allows empty body (multipart)
- Passed through to provider

**Provider Support**
| Provider | Supported |
|----------|-----------|
| OpenAI | Yes |
| Anthropic | No (returns 400) |

---

## Provider Path Mappings

### OpenAI

| Gateway Path | Provider Path |
|--------------|---------------|
| `/v1/chat/completions` | `/chat/completions` |
| `/v1/completions` | `/completions` |
| `/v1/embeddings` | `/embeddings` |
| `/v1/images/generations` | `/images/generations` |
| `/v1/images/edits` | `/images/edits` |
| `/v1/audio/speech` | `/audio/speech` |
| `/v1/audio/transcriptions` | `/audio/transcriptions` |
| `/v1/audio/translations` | `/audio/translations` |
| `/v1/models` | `/models` |

### Anthropic

| Gateway Path | Provider Path |
|--------------|---------------|
| `/v1/chat/completions` | `/messages` |

---

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": {
    "error": "Invalid request body",
    "details": [...]
  }
}
```

### 400 Bad Request - Missing Body
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Request body required"
}
```

### 400 Bad Request - Unsupported Provider
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Unsupported provider: xyz. Supported: openai, anthropic"
}
```

### 400 Bad Request - Unsupported Path (Anthropic)
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Unsupported anthropic path"
}
```

### 500 Internal Server Error - Provider Error
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "OpenAI request failed: <error message>"
}
```

### 500 Internal Server Error - API Key Missing
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "OpenAI API key not configured"
}
```

### 500 Internal Server Error - All Providers Failed
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "All providers failed to process request"
}
```

---

**Document Version:** 1.0.0  
**Based on:** `src/routes/*`, `src/validation/schemas.ts`, `src/providers/*`
