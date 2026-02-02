export const INTERNAL_PROVIDER_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    organization: process.env.OPENAI_ORGANIZATION ?? '',
    project: process.env.OPENAI_PROJECT ?? '',
    beta: process.env.OPENAI_BETA ?? '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    baseUrl: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1',
    version: process.env.ANTHROPIC_VERSION ?? '2023-06-01',
    beta: process.env.ANTHROPIC_BETA ?? 'messages-2023-12-15',
  },
} as const
