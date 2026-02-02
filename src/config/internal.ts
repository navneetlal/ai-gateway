export const INTERNAL_PROVIDER_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    baseUrl: process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1',
    version: process.env.ANTHROPIC_VERSION ?? '2023-06-01',
  },
} as const
