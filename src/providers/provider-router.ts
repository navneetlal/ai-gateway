import { FastifyReply, FastifyRequest } from 'fastify'

import { HEADER_KEYS } from '../config/headers'
import { PROVIDER_HANDLERS, PROVIDERS, ProviderKey } from './registry'
import { resolveFailoverProvidersFromHeaders, resolveProviderFromHeaders } from '../utils/providers'

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
    request.log.warn({ provider }, 'Unsupported provider requested')
    reply.badRequest(`Unsupported provider: ${provider}. Supported: ${PROVIDERS.join(', ')}`)
    return
  }

  const path = resolveRequestPath(request)
  const failover = resolveFailoverProvidersFromHeaders(request.headers)
    .filter((value) => value !== provider)
    .filter((value) => PROVIDERS.includes(value as ProviderKey)) as ProviderKey[]

  const providersToTry: ProviderKey[] = [provider, ...failover]
  let lastError: unknown
  let attemptIndex = 0

  request.log.debug({ provider, failover, path }, 'Routing request to provider')

  for (const candidate of providersToTry) {
    const candidateHandler = PROVIDER_HANDLERS[candidate]
    if (!candidateHandler) continue

    try {
      if (attemptIndex > 0) {
        request.log.info(
          { provider: candidate, previousProvider: providersToTry[attemptIndex - 1], attempt: attemptIndex + 1 },
          'Attempting failover to next provider'
        )
      }

      reply.header(HEADER_KEYS.PROVIDER_USED, candidate)
      await candidateHandler(request, reply, path)
      return
    } catch (error) {
      lastError = error
      request.log.warn(
        { provider: candidate, error: (error as Error).message, attempt: attemptIndex + 1 },
        'Provider request failed'
      )

      if (reply.sent) {
        return
      }

      attemptIndex += 1
    }
  }

  if (!reply.sent) {
    const message =
      lastError instanceof Error ? lastError.message : 'All providers failed to process request'
    request.log.error({ providers: providersToTry, error: message }, 'All providers failed')
    reply.internalServerError(message)
  }
}
