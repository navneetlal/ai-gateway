# Contributing to AI Gateway

Thank you for your interest in contributing to AI Gateway! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/ai-gateway.git
   cd ai-gateway
   ```
3. Install dependencies:
   ```bash
   yarn install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 18+
- Yarn

### Running Locally

```bash
# Development mode with hot reload
yarn dev

# Build TypeScript
yarn build:ts

# Production mode
yarn start
```

### Environment Variables

Create a `.env` file for local development:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Code Style

### General Guidelines

- Use TypeScript for all new code
- Use `async/await` over raw promises
- Prefer `const` over `let`
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic

### File Naming

- Use kebab-case for file names: `provider-router.ts`
- Use PascalCase for types/interfaces: `ProviderKey`
- Use camelCase for functions and variables: `handleProviderRequest`

### Import Order

1. Node.js built-in modules
2. External dependencies
3. Internal modules

```typescript
import { Readable } from 'node:stream'

import { FastifyReply, FastifyRequest } from 'fastify'

import { INTERNAL_PROVIDER_CONFIG } from '../../config/internal'
```

### Error Handling

- Use `reply.badRequest()`, `reply.internalServerError()` from `@fastify/sensible`
- Wrap external calls (fetch, JSON.parse) in try/catch
- Return meaningful error messages

```typescript
try {
  response = await fetch(targetUrl, options)
} catch (error) {
  reply.internalServerError(`Provider request failed: ${(error as Error).message}`)
  return
}
```

## Adding a New Provider

Follow these steps to add support for a new LLM provider:

### Step 1: Create Provider Directory

```bash
mkdir -p src/providers/<provider-name>
```

### Step 2: Add Provider Configuration

Edit `src/config/internal.ts`:

```typescript
export const INTERNAL_PROVIDER_CONFIG = {
  // ...existing providers
  providername: {
    apiKey: process.env.PROVIDERNAME_API_KEY ?? '',
    baseUrl: process.env.PROVIDERNAME_BASE_URL ?? 'https://api.provider.com/v1',
    // Add any provider-specific config
  },
}
```

### Step 3: Add Path Mapping

Edit `src/config/provider-mapping.ts`:

```typescript
export const PROVIDER_PATHS: Record<string, Record<string, string>> = {
  // ...existing providers
  providername: {
    '/v1/chat/completions': '/chat',  // Map our routes to provider routes
  },
}
```

### Step 4: Create Provider Proxy

Create `src/providers/<provider-name>/proxy.ts`:

```typescript
import { FastifyReply, FastifyRequest } from 'fastify'

import { INTERNAL_PROVIDER_CONFIG } from '../../config/internal'
import { PROVIDER_PATHS } from '../../config/provider-mapping'
import { buildProxyHeaders } from '../utils'

const resolveProviderPath = (path: string): string => {
  const providerPaths = PROVIDER_PATHS.providername as Record<string, string>
  return providerPaths[path] ?? path
}

// Transform OpenAI format to provider format
const transformToProvider = (body: any): any => {
  // Implement transformation logic
  return body
}

// Transform provider response to OpenAI format
const transformToOpenAI = (response: any): any => {
  // Implement transformation logic
  return response
}

export const proxyProviderName = async (
  request: FastifyRequest,
  reply: FastifyReply,
  path: string
): Promise<void> => {
  const { apiKey, baseUrl } = INTERNAL_PROVIDER_CONFIG.providername
  
  if (!apiKey) {
    reply.internalServerError('Provider API key not configured')
    return
  }

  // Validate supported paths
  if (path !== '/v1/chat/completions') {
    reply.badRequest('Unsupported path for this provider')
    return
  }

  const providerPath = resolveProviderPath(path)
  const targetUrl = new URL(providerPath, baseUrl).toString()
  
  // Build headers for provider
  const headers = new Headers()
  headers.set('Authorization', `Bearer ${apiKey}`)
  headers.set('Content-Type', 'application/json')

  const payload = transformToProvider(request.body)

  let response: Response
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } catch (error) {
    reply.internalServerError(`Provider request failed: ${(error as Error).message}`)
    return
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    reply.status(response.status).send(errorPayload ?? { error: 'Request failed' })
    return
  }

  const responseJson = await response.json().catch(() => null)
  reply.status(200).send(transformToOpenAI(responseJson))
}
```

### Step 5: Register Provider

Edit `src/providers/registry.ts`:

```typescript
import { proxyProviderName } from './providername/proxy'

export const PROVIDER_HANDLERS = {
  // ...existing providers
  providername: proxyProviderName,
}
```

### Step 6: Update Documentation

- Update `README.md` provider compatibility table
- Add environment variables to configuration section

### Provider Implementation Checklist

- [ ] Request transformation (OpenAI → Provider format)
- [ ] Response transformation (Provider → OpenAI format)
- [ ] Streaming support (if provider supports it)
- [ ] Tool/function calling (if provider supports it)
- [ ] Error handling with meaningful messages
- [ ] Unsupported route handling
- [ ] Documentation updates

### Key Transformations to Implement

When adding a provider, ensure these are handled:

| OpenAI Format | Your Provider Format |
|---------------|---------------------|
| `messages[].role: "system"` | Provider's system message format |
| `messages[].role: "assistant"` with `tool_calls` | Provider's tool use format |
| `messages[].role: "tool"` | Provider's tool result format |
| `messages[].content` (array with images) | Provider's multimodal format |
| `tools` array | Provider's tool definition format |
| `tool_choice` | Provider's tool choice format |
| `stop` | Provider's stop sequence format |
| `finish_reason: "tool_calls"` | Map from provider's stop reason |

## Testing

### Manual Testing

Test your changes with curl:

```bash
# Test chat completion
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: <provider>" \
  -d '{
    "model": "<model-name>",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Test streaming
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: <provider>" \
  -d '{
    "model": "<model-name>",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'

# Test tool calling
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: <provider>" \
  -d '{
    "model": "<model-name>",
    "messages": [{"role": "user", "content": "What is 2+2?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "calculator",
        "parameters": {"type": "object", "properties": {}}
      }
    }]
  }'
```

### Verify Response Format

Ensure responses match OpenAI format:

```json
{
  "id": "...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "...",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## Submitting Changes

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for <provider> provider
fix: correct tool call streaming for anthropic
docs: update provider compatibility table
refactor: extract common transform utilities
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Pull Request Process

1. Ensure your code builds without errors:
   ```bash
   yarn build:ts
   ```

2. Update documentation if needed

3. Create a pull request with:
   - Clear title describing the change
   - Description of what and why
   - Any breaking changes noted
   - Screenshots/examples if applicable

4. Address review feedback

### PR Title Format

```
feat(provider): add Google Gemini support
fix(anthropic): correct streaming finish_reason
docs: add troubleshooting section
```

## Questions?

If you have questions about contributing, please open an issue for discussion.
