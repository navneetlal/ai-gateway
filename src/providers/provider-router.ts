import { FastifyReply, FastifyRequest } from 'fastify'

import { PROVIDER_HANDLERS, PROVIDERS, ProviderKey } from './registry'
import { resolveProviderFromHeaders } from './utils'

const DEFAULT_PROVIDER: ProviderKey = 'openai'

export const handleProviderRequest = async (
  request: FastifyRequest,
  reply: FastifyReply,
  path: string
): Promise<void> => {
  const resolved = resolveProviderFromHeaders(request.headers)
  const provider = (resolved ?? DEFAULT_PROVIDER) as ProviderKey
  const handler = PROVIDER_HANDLERS[provider]

  if (!handler) {
    const payload = {
      error: `Unsupported provider: ${provider}`,
      supportedProviders: PROVIDERS,
    }
    if (typeof reply.badRequest === 'function') {
      reply.badRequest(payload as any)
    } else {
      reply.status(400).send(payload)
    }
    return
  }

  return handler(request, reply, path)
}
