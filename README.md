# AI Gateway

A unified API gateway for LLM providers. Route requests to OpenAI, Anthropic, and other LLM providers through a single OpenAI-compatible API interface.

## Features

- **OpenAI-compatible API**: Use familiar OpenAI API format with any supported provider
- **Provider abstraction**: Switch between providers by changing a header
- **Request/response transformation**: Automatic translation between OpenAI and provider-native formats
- **Streaming support**: Full SSE streaming for chat completions
- **Tool/function calling**: Unified tool calling across providers
- **Multimodal support**: Images and files work across providers

## Supported Providers

| Provider | Chat Completions | Streaming | Tool Calling | Images | Status |
|----------|-----------------|-----------|--------------|--------|--------|
| OpenAI | ✓ | ✓ | ✓ | ✓ | Stable |
| Anthropic | ✓ | ✓ | ✓ | ✓ | Stable |

More providers coming soon.

## Installation

```bash
# Install dependencies
yarn install

# Build
yarn build:ts

# Run development server
yarn dev

# Run production server
yarn start
```

## Configuration

Set environment variables for provider credentials:

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1  # optional
OPENAI_ORGANIZATION=org-...                 # optional
OPENAI_PROJECT=proj-...                     # optional
OPENAI_BETA=...                             # optional

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1  # optional
ANTHROPIC_VERSION=2023-06-01                      # optional
ANTHROPIC_BETA=messages-2023-12-15                # optional
```

## API Routes

All routes follow OpenAI API format:

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Health check |
| GET | `/v1/models` | List models |
| POST | `/v1/chat/completions` | Chat completion |
| POST | `/v1/completions` | Text completion |
| POST | `/v1/embeddings` | Generate embeddings |
| POST | `/v1/images/generations` | Generate images |
| POST | `/v1/images/edits` | Edit images |
| POST | `/v1/audio/speech` | Text to speech |
| POST | `/v1/audio/transcriptions` | Speech to text |
| POST | `/v1/audio/translations` | Audio translation |

> Note: Not all routes are supported by all providers. See provider compatibility below.

## Usage

### Select Provider

Use the `x-aigateway-provider` header to select a provider:

```bash
# Use OpenAI (default)
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: openai" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Use Anthropic
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: anthropic" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Streaming

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: anthropic" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### Tool Calling

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: openai" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "What is the weather in Tokyo?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get weather for a location",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {"type": "string"}
          },
          "required": ["location"]
        }
      }
    }]
  }'
```

### Using Config Header

Alternatively, use `x-aigateway-config` header with JSON:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H 'x-aigateway-config: {"provider": "anthropic"}' \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Provider Compatibility

### OpenAI
All routes supported.

### Anthropic
Only `/v1/chat/completions` is supported. Other routes will return a 400 error.

The gateway automatically transforms:
- System messages → Anthropic `system` field
- Tool calls → Anthropic `tool_use` format
- Images → Anthropic image format
- Stop sequences → `stop_sequences`
- Response format → OpenAI-compatible format

## Adding New Providers

To add a new provider:

1. **Create provider proxy** in `src/providers/<provider>/proxy.ts`:

```typescript
import { FastifyReply, FastifyRequest } from 'fastify'

export const proxy<Provider> = async (
  request: FastifyRequest,
  reply: FastifyReply,
  path: string
): Promise<void> => {
  // Transform request to provider format
  // Make request to provider
  // Transform response to OpenAI format
  // Send response
}
```

2. **Add provider config** in `src/config/internal.ts`:

```typescript
export const INTERNAL_PROVIDER_CONFIG = {
  // ...existing providers
  newprovider: {
    apiKey: process.env.NEWPROVIDER_API_KEY ?? '',
    baseUrl: process.env.NEWPROVIDER_BASE_URL ?? 'https://api.newprovider.com',
  },
}
```

3. **Add path mapping** in `src/config/provider-mapping.ts`:

```typescript
export const PROVIDER_PATHS = {
  // ...existing providers
  newprovider: {
    '/v1/chat/completions': '/chat',  // map to provider's path
  },
}
```

4. **Register provider** in `src/providers/registry.ts`:

```typescript
import { proxyNewProvider } from './newprovider/proxy'

export const PROVIDER_HANDLERS = {
  // ...existing providers
  newprovider: proxyNewProvider,
}
```

## Project Structure

```
src/
├── config/
│   ├── headers.ts          # Header key constants
│   ├── internal.ts         # Provider credentials config
│   └── provider-mapping.ts # Route path mappings
├── providers/
│   ├── anthropic/
│   │   └── proxy.ts        # Anthropic provider logic
│   ├── openai/
│   │   └── proxy.ts        # OpenAI provider logic
│   ├── provider-router.ts  # Routes requests to providers
│   ├── registry.ts         # Provider handler registry
│   └── utils.ts            # Shared utilities
├── routes/
│   ├── root.ts             # Health check route
│   └── v1/                 # API routes
├── validation/
│   ├── schemas.ts          # Zod request schemas
│   └── validate.ts         # Validation utilities
└── app.ts                  # Fastify app setup
```

## License

AGPL-3.0 - See [LICENSE](LICENSE) for details.
