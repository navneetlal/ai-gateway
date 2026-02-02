import { FastifyReply, FastifyRequest } from 'fastify'

import { PROVIDER_HANDLERS, PROVIDERS, ProviderKey } from './registry'
import { resolveProviderFromHeaders } from './utils'

const DEFAULT_PROVIDER: ProviderKey = 'openai'

const resolveRequestPath = (request: FastifyRequest): string => {
  try {
    return new URL(request.url, 'http://localhost').pathname
  } catch {
    return request.url
  }
}

export const handleProviderRequest = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const resolved = resolveProviderFromHeaders(request.headers)
  const provider = (resolved ?? DEFAULT_PROVIDER) as ProviderKey
  const handler = PROVIDER_HANDLERS[provider]

  if (!handler) {
    reply.badRequest(`Unsupported provider: ${provider}. Supported: ${PROVIDERS.join(', ')}`)
    return
  }

  const path = resolveRequestPath(request)
  return handler(request, reply, path)
}
