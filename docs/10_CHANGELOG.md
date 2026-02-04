# Changelog

## Rules (MUST FOLLOW)

- Any deviation from `/docs` requirements must be recorded here
- Each entry must include: date, change summary, reason, and impacted files

---

## Unreleased

- None

---

## 2026-02-04

### Documentation Created
- Created comprehensive documentation suite for AI Gateway
- Based on existing codebase implementation (v0.0.1)

**Files Created:**
- `docs/00_AGENT_CONTRACT.md` - Agent rules and constraints
- `docs/01_PRODUCT_REQUIREMENTS.md` - Functional and non-functional requirements
- `docs/02_SYSTEM_DESIGN.md` - Architecture and folder structure
- `docs/03_API_SPEC.md` - API endpoints and response formats
- `docs/04_DATA_MODEL.md` - Data structures and schemas
- `docs/05_ERROR_HANDLING.md` - Error responses and logging
- `docs/06_SECURITY.md` - Security implementation status
- `docs/07_OBSERVABILITY.md` - Logging and metrics
- `docs/09_RUNBOOK.md` - Operations and environment variables
- `docs/10_CHANGELOG.md` - This file
- `docs/OPEN_QUESTIONS.md` - Gaps and ambiguities
- `docs/GLOSSARY.md` - Term definitions

**Reason:** Establish authoritative documentation for AI agent development

---

## Initial Implementation (Pre-documentation)

### Core Features Implemented
- Fastify 5.x REST API server
- OpenAI provider proxy (passthrough)
- Anthropic provider proxy (with transformation)
- Provider routing via headers
- Provider failover mechanism
- Circuit breaker pattern
- Exponential backoff retry logic
- Zod request validation
- SSE streaming support

### Providers
- OpenAI: All `/v1/*` routes
- Anthropic: `/v1/chat/completions` only

### Routes
- `GET /` - Health check
- `GET /v1/models` - List models
- `POST /v1/chat/completions` - Chat completion
- `POST /v1/completions` - Text completion
- `POST /v1/embeddings` - Embeddings
- `POST /v1/images/generations` - Image generation
- `POST /v1/images/edits` - Image editing
- `POST /v1/audio/speech` - Text to speech
- `POST /v1/audio/transcriptions` - Speech to text
- `POST /v1/audio/translations` - Audio translation

---

## Deviation Log

No deviations from documentation have been recorded yet.

### Template for Future Deviations

```
## YYYY-MM-DD

### [Change Title]
- **Deviation:** What was changed from the documented spec
- **Reason:** Why the change was necessary
- **Impacted Files:** List of files modified
- **Documentation Updated:** Yes/No (if No, explain why)
```

---

**Document Version:** 1.0.0
