export const PROVIDER_PATHS: Record<string, Record<string, string>> = {
  openai: {
    '/v1/chat/completions': '/chat/completions',
    '/v1/completions': '/completions',
    '/v1/embeddings': '/embeddings',
    '/v1/images/generations': '/images/generations',
    '/v1/images/edits': '/images/edits',
    '/v1/audio/speech': '/audio/speech',
    '/v1/audio/transcriptions': '/audio/transcriptions',
    '/v1/audio/translations': '/audio/translations',
    '/v1/models': '/models',
  },
  anthropic: {
    '/v1/chat/completions': '/messages',
  },
}
