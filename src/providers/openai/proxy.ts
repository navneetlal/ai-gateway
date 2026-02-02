import { Readable } from 'node:stream'

import { FastifyReply, FastifyRequest } from 'fastify'

import { INTERNAL_PROVIDER_CONFIG } from '../../config/internal'
import { buildProxyHeaders } from '../utils'

const RESPONSE_HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'transfer-encoding',
  'content-length',
])

const buildTargetUrl = (request: FastifyRequest, path: string): string => {
  const { baseUrl } = INTERNAL_PROVIDER_CONFIG.openai
  const targetUrl = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  const incomingUrl = new URL(request.url, 'http://localhost')
  targetUrl.search = incomingUrl.search
  return targetUrl.toString()
}

const buildProxyBody = (
  request: FastifyRequest,
  contentType: string | null
): string | Buffer | FastifyRequest['raw'] | undefined => {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined
  }

  const body = request.body
  if (body === undefined || body === null) {
    return request.raw
  }

  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    return body
  }

  if (contentType?.includes('application/json')) {
    return JSON.stringify(body)
  }

  return JSON.stringify(body)
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
  const { apiKey } = INTERNAL_PROVIDER_CONFIG.openai
  if (!apiKey) {
    reply.internalServerError('OpenAI API key not configured')
    return
  }

  const targetUrl = buildTargetUrl(request, path)
  const headers = buildProxyHeaders(request.headers, apiKey)
  const contentType = headers.get('content-type')
  const body = buildProxyBody(request, contentType)

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: body as any,
    ...(body === request.raw ? { duplex: 'half' } : {}),
  })

  applyResponseHeaders(reply, response)
  reply.status(response.status)

  if (response.body) {
    const nodeStream = Readable.fromWeb(response.body as any)
    reply.send(nodeStream)
    return
  }

  reply.send()
}
