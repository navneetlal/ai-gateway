import { Readable } from 'node:stream'

import { FastifyReply, FastifyRequest } from 'fastify'

import { INTERNAL_PROVIDER_CONFIG } from '../../config/internal'
import { PROVIDER_PATHS } from '../../config/provider-mapping'
import { createCircuitBreaker } from '../../utils/circuit-breaker'
import { requestWithRetry } from '../../utils/http-client'
import { buildProxyHeaders, hasFailoverHeader } from '../../utils/providers'

const RESPONSE_HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'transfer-encoding',
  'content-length',
])

const openAiCircuitBreaker = createCircuitBreaker({ name: 'openai' })

const resolveProviderPath = (path: string): string => {
  const providerPaths = PROVIDER_PATHS.openai as Record<string, string>
  return providerPaths[path] ?? path
}

const buildTargetUrl = (request: FastifyRequest, path: string): string => {
  const { baseUrl } = INTERNAL_PROVIDER_CONFIG.openai
  const providerPath = resolveProviderPath(path)
  const targetUrl = new URL(
    providerPath,
    baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  )
  const incomingUrl = new URL(request.url, 'http://localhost')
  targetUrl.search = incomingUrl.search
  return targetUrl.toString()
}

const transformRequestBody = (path: string, body: unknown): unknown => {
  switch (path) {
    case '/v1/chat/completions':
    case '/v1/completions':
    case '/v1/embeddings':
    case '/v1/images/generations':
    case '/v1/images/edits':
    case '/v1/audio/speech':
    case '/v1/audio/transcriptions':
    case '/v1/audio/translations':
      return body
    default:
      return body
  }
}

const buildProxyBody = (
  request: FastifyRequest,
  contentType: string | null,
  path: string
): string | Buffer | FastifyRequest['raw'] | undefined => {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined
  }

  if (contentType?.includes('multipart/form-data')) {
    return request.raw
  }

  const body = request.body
  if (body === undefined || body === null) {
    return undefined
  }

  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    return body
  }

  if (contentType?.includes('application/json')) {
    return JSON.stringify(transformRequestBody(path, body))
  }

  return JSON.stringify(transformRequestBody(path, body))
}

const applyResponseHeaders = (reply: FastifyReply, response: Response): void => {
  for (const [key, value] of response.headers.entries()) {
    if (RESPONSE_HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue
    reply.header(key, value)
  }
}

export const proxyOpenAI = async (
  request: FastifyRequest,
  reply: FastifyReply,
  path: string
): Promise<void> => {
  const { apiKey, organization, project, beta } = INTERNAL_PROVIDER_CONFIG.openai
  const failoverRequested = hasFailoverHeader(request.headers)

  if (!apiKey) {
    request.log.error('OpenAI API key not configured')
    if (failoverRequested) {
      throw new Error('OpenAI API key not configured')
    }
    reply.internalServerError('OpenAI API key not configured')
    return
  }

  const targetUrl = buildTargetUrl(request, path)
  const headers = buildProxyHeaders(request.headers, apiKey)
  if (organization && !headers.has('OpenAI-Organization')) {
    headers.set('OpenAI-Organization', organization)
  }
  if (project && !headers.has('OpenAI-Project')) {
    headers.set('OpenAI-Project', project)
  }
  if (beta && !headers.has('OpenAI-Beta')) {
    headers.set('OpenAI-Beta', beta)
  }
  const contentType = headers.get('content-type')
  const body = buildProxyBody(request, contentType, path)

  const retryOptions =
    body === request.raw
      ? { retries: 0, circuitBreaker: openAiCircuitBreaker, logger: request.log }
      : { circuitBreaker: openAiCircuitBreaker, logger: request.log }

  request.log.debug({ targetUrl, method: request.method, path }, 'Proxying request to OpenAI')

  let response: Response
  try {
    response = await requestWithRetry(
      targetUrl,
      {
        method: request.method,
        headers,
        body: body as any,
        ...(body === request.raw ? { duplex: 'half' } : {}),
      },
      retryOptions
    )
  } catch (error) {
    request.log.error({ error: (error as Error).message, path }, 'OpenAI request failed')
    if (failoverRequested) {
      throw error
    }
    reply.internalServerError(`OpenAI request failed: ${(error as Error).message}`)
    return
  }

  request.log.debug({ status: response.status, path }, 'OpenAI response received')

  if (failoverRequested && response.status >= 500) {
    request.log.warn({ status: response.status, path }, 'OpenAI returned 5xx, triggering failover')
    await response.arrayBuffer().catch(() => undefined)
    throw new Error(`OpenAI request failed with status ${response.status}`)
  }

  applyResponseHeaders(reply, response)
  reply.status(response.status)

  if (response.body) {
    const nodeStream = Readable.fromWeb(response.body as any)
    reply.send(nodeStream)
    return
  }

  reply.send()
}
