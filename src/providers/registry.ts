import { proxyOpenAI } from './openai/proxy'

export const PROVIDER_HANDLERS = {
  openai: proxyOpenAI,
} as const

export type ProviderKey = keyof typeof PROVIDER_HANDLERS

export const PROVIDERS = Object.keys(PROVIDER_HANDLERS) as ProviderKey[]
