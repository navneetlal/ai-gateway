import { FastifyReply, FastifyRequest } from 'fastify'

import { INTERNAL_PROVIDER_CONFIG } from '../../config/internal'
import { PROVIDER_PATHS } from '../../config/provider-mapping'
import { buildProxyHeaders } from '../utils'

const resolveProviderPath = (path: string): string => {
  const providerPaths = PROVIDER_PATHS.anthropic as Record<string, string>
  return providerPaths[path] ?? path
}

const buildTargetUrl = (request: FastifyRequest, path: string): string => {
  const { baseUrl } = INTERNAL_PROVIDER_CONFIG.anthropic
  const providerPath = resolveProviderPath(path)
  const targetUrl = new URL(
    providerPath,
    baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  )
  const incomingUrl = new URL(request.url, 'http://localhost')
  targetUrl.search = incomingUrl.search
  return targetUrl.toString()
}

const toAnthropicMessages = (messages: any[]): { system?: string; messages: any[] } => {
  const systemParts: string[] = []
  const anthropicMessages: any[] = []

  for (const message of messages) {
    if (!message || typeof message !== 'object') continue
    if (message.role === 'system') {
      if (typeof message.content === 'string') {
        systemParts.push(message.content)
      }
      continue
    }

    anthropicMessages.push({
      role: message.role,
      content: message.content,
    })
  }

  return {
    system: systemParts.length ? systemParts.join('\n') : undefined,
    messages: anthropicMessages,
  }
}

const transformToAnthropic = (body: any): any => {
  const { system, messages } = toAnthropicMessages(body.messages ?? [])
  return {
    model: body.model,
    max_tokens: body.max_tokens ?? body.max_completion_tokens ?? 1024,
    messages,
    ...(system ? { system } : {}),
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
    ...(body.stream !== undefined ? { stream: body.stream } : {}),
    ...(body.stop !== undefined ? { stop_sequences: body.stop } : {}),
  }
}

const mapStopReason = (reason?: string): string | null => {
  if (!reason) return null
  if (reason === 'max_tokens') return 'length'
  return 'stop'
}

const transformToOpenAI = (response: any): any => {
  const contentBlocks = Array.isArray(response?.content) ? response.content : []
  const text = contentBlocks
    .map((block: any) => (block?.type === 'text' ? block.text : ''))
    .join('')

  const promptTokens = response?.usage?.input_tokens ?? 0
  const completionTokens = response?.usage?.output_tokens ?? 0

  return {
    id: response?.id ?? 'anthropic-response',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: response?.model ?? 'anthropic',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: text,
        },
        finish_reason: mapStopReason(response?.stop_reason),
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  }
}

const buildAnthropicHeaders = (
  request: FastifyRequest,
  apiKey: string,
  version: string
): Headers => {
  const headers = buildProxyHeaders(request.headers, apiKey)
  headers.delete('authorization')
  headers.set('x-api-key', apiKey)
  headers.set('anthropic-version', version)
  headers.set('content-type', 'application/json')
  return headers
}

export const proxyAnthropic = async (
  request: FastifyRequest,
  reply: FastifyReply,
  path: string
): Promise<void> => {
  const { apiKey, version } = INTERNAL_PROVIDER_CONFIG.anthropic
  if (!apiKey) {
    reply.internalServerError('Anthropic API key not configured')
    return
  }

  if (path !== '/v1/chat/completions') {
    reply.badRequest('Anthropic provider only supports chat completions')
    return
  }

  if (request.body && (request.body as any).stream) {
    reply.badRequest('Anthropic streaming not supported yet')
    return
  }

  const targetUrl = buildTargetUrl(request, path)
  const headers = buildAnthropicHeaders(request, apiKey, version)
  const transformed = transformToAnthropic(request.body as any)

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(transformed),
  })

  const responseJson = await response.json().catch(() => null)
  if (!response.ok) {
    reply.status(response.status).send(responseJson ?? { error: 'Anthropic request failed' })
    return
  }

  reply.status(200).send(transformToOpenAI(responseJson))
}
