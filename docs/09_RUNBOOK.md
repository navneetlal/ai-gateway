# Runbook

## Rules (MUST FOLLOW)

- This file is the authoritative list of environment variables
- The app currently does NOT fail fast on startup if required env vars are missing (checked at request time)

---

## Environment Variables (Authoritative)

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `NODE_ENV` | No | (none) | Runtime mode. Set to `production` to disable pino-pretty |
| `LOG_LEVEL` | No | `info` | Logging level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `OPENAI_API_KEY` | Yes* | `''` | OpenAI API key |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI API base URL |
| `OPENAI_ORGANIZATION` | No | `''` | OpenAI organization ID |
| `OPENAI_PROJECT` | No | `''` | OpenAI project ID |
| `OPENAI_BETA` | No | `''` | OpenAI beta features header |
| `ANTHROPIC_API_KEY` | Yes* | `''` | Anthropic API key |
| `ANTHROPIC_BASE_URL` | No | `https://api.anthropic.com/v1` | Anthropic API base URL |
| `ANTHROPIC_VERSION` | No | `2023-06-01` | Anthropic API version header |
| `ANTHROPIC_BETA` | No | `messages-2023-12-15` | Anthropic beta features header |

*Required if using that provider. Missing API key results in 500 error at request time.

---

## Local Development

### Prerequisites
- Node.js 18+
- Yarn

### Install Dependencies
```bash
yarn install
```

### Configure Environment
```bash
# Create .env file with your API keys
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# Or create a .env file (not committed)
echo "OPENAI_API_KEY=sk-..." > .env
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

### Run Development Server
```bash
yarn dev
```

This runs:
1. `yarn build:ts` - Compile TypeScript
2. `concurrently` - Run TypeScript watcher and Fastify server in parallel

Server starts on `http://localhost:3000` by default.

### Build Only
```bash
yarn build:ts
```

Compiles TypeScript to `dist/` directory.

---

## Production Run

### Build
```bash
yarn build:ts
```

### Start
```bash
yarn start
```

This runs:
```bash
fastify start -l info dist/app.js
```

### With Environment Variables
```bash
NODE_ENV=production \
LOG_LEVEL=info \
OPENAI_API_KEY=sk-... \
ANTHROPIC_API_KEY=sk-ant-... \
yarn start
```

---

## Health Check

### Endpoint
```
GET /
```

### Success Response
```
HTTP/1.1 200 OK
Content-Type: text/plain

All is well!
```

### Verify
```bash
curl http://localhost:3000/
# Response: All is well!
```

---

## Test Provider Connectivity

### Test OpenAI
```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: openai" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10
  }'
```

### Test Anthropic
```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: anthropic" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10
  }'
```

### Test Failover
```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aigateway-provider: openai" \
  -H "x-aigateway-failover: anthropic" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## Troubleshooting

### App exits on boot
- **Cause:** TypeScript compilation error
- **Fix:** Run `yarn build:ts` and check for errors

### 500 "OpenAI API key not configured"
- **Cause:** `OPENAI_API_KEY` environment variable is empty or not set
- **Fix:** Set the environment variable with a valid API key

### 500 "Anthropic API key not configured"
- **Cause:** `ANTHROPIC_API_KEY` environment variable is empty or not set
- **Fix:** Set the environment variable with a valid API key

### 400 "Unsupported provider: xyz"
- **Cause:** `x-aigateway-provider` header contains unknown provider
- **Fix:** Use `openai` or `anthropic`

### 400 "Unsupported anthropic path"
- **Cause:** Trying to use Anthropic for non-chat-completions endpoint
- **Fix:** Only use `/v1/chat/completions` with Anthropic, or switch to OpenAI

### 500 "Circuit open for openai/anthropic"
- **Cause:** Circuit breaker is open due to repeated failures
- **Fix:** Wait 10 seconds for cooldown, then requests will be allowed again

### 400 "Request body required"
- **Cause:** POST request without body to endpoint requiring one
- **Fix:** Include JSON request body

### 400 "Invalid request body"
- **Cause:** Request body missing required fields or wrong types
- **Fix:** Check `details` array in response for specific field errors

### Logs not appearing
- **Cause:** Log level set higher than events being logged
- **Fix:** Set `LOG_LEVEL=debug` or `LOG_LEVEL=trace`

### Pretty logs in production
- **Cause:** `NODE_ENV` not set to `production`
- **Fix:** Set `NODE_ENV=production` for JSON logs

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `yarn dev` | `build:ts && concurrently...` | Development with hot reload |
| `yarn start` | `build:ts && fastify start...` | Production start |
| `yarn build:ts` | `tsc` | Compile TypeScript |
| `yarn watch:ts` | `tsc -w` | Watch mode compilation |
| `yarn test` | `build:ts && tsc -p test/...` | Run tests |

---

## Port Configuration

The server port is NOT configurable via environment variable in current implementation.

- **Default port:** 3000 (Fastify CLI default)
- **To change:** Modify CLI arguments in `package.json` or use `fastify start --port <port>`

---

**Document Version:** 1.0.0  
**Based on:** `package.json`, `src/config/internal.ts`, `src/app.ts`
