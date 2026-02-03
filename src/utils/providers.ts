import { HEADER_KEYS } from '../config/headers'

const HOP_BY_HOP_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'accept-encoding',
])

const INTERNAL_PREFIX = 'x-aigateway-'

export const buildProxyHeaders = (
  incoming: Record<string, string | string[] | undefined>,
  apiKey: string
): Headers => {
  const headers = new Headers()

  for (const [key, value] of Object.entries(incoming)) {
    if (!value) continue
    const normalizedKey = key.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(normalizedKey)) continue
    if (normalizedKey.startsWith(INTERNAL_PREFIX)) continue

    const headerValue = Array.isArray(value) ? value[0] : value
    headers.set(key, headerValue)
  }

  headers.set('authorization', `Bearer ${apiKey}`)
  return headers
}

export const resolveProviderFromHeaders = (
  incoming: Record<string, string | string[] | undefined>
): string | undefined => {
  const providerHeader = incoming[HEADER_KEYS.PROVIDER]
  if (typeof providerHeader === 'string' && providerHeader.trim()) {
    return providerHeader.trim().toLowerCase()
  }

  const configHeader = incoming[HEADER_KEYS.CONFIG]
  if (typeof configHeader === 'string' && configHeader.trim()) {
    try {
      const parsed = JSON.parse(configHeader)
      const provider = parsed?.provider
      if (typeof provider === 'string' && provider.trim()) {
        return provider.trim().toLowerCase()
      }
    } catch {
      return undefined
    }
  }

  return undefined
}

export const resolveFailoverProvidersFromHeaders = (
  incoming: Record<string, string | string[] | undefined>
): string[] => {
  const header = incoming[HEADER_KEYS.FAILOVER]
  if (!header) return []

  const raw = Array.isArray(header) ? header.join(',') : header
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
}

export const hasFailoverHeader = (
  incoming: Record<string, string | string[] | undefined>
): boolean => resolveFailoverProvidersFromHeaders(incoming).length > 0
