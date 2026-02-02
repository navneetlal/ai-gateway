import { Readable } from 'node:stream'

import { FastifyReply, FastifyRequest } from 'fastify'

import { INTERNAL_PROVIDER_CONFIG } from '../../config/internal'
import { PROVIDER_PATHS } from '../../config/provider-mapping'
import { buildProxyHeaders } from '../utils'

const SYSTEM_MESSAGE_ROLES = new Set(['system'])

const fileExtensionMimeTypeMap = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

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

const withEphemeralCache = (value: any): any => {
  if (!value) return value
  return { cache_control: { type: 'ephemeral' } }
}

const transformAndAppendImageContentItem = (item: any, content: any[]): void => {
  if (!item?.image_url?.url) return
  const url = item.image_url.url
  if (typeof url !== 'string') return

  if (!url.startsWith('data:')) {
    content.push({
      type: 'image',
      source: {
        type: 'url',
        url,
      },
    })
    return
  }

  const parts = url.split(';')
  if (parts.length !== 2) return
  const base64Parts = parts[1].split(',')
  const base64Image = base64Parts[1]
  const mediaTypeParts = parts[0].split(':')
  if (mediaTypeParts.length !== 2 || !base64Image) return
  const mediaType = mediaTypeParts[1]
  const isPdf = mediaType === fileExtensionMimeTypeMap.pdf
  content.push({
    type: isPdf ? 'document' : 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data: base64Image,
    },
    ...(item.cache_control ? withEphemeralCache(true) : {}),
  })
}

const transformAndAppendFileContentItem = (item: any, content: any[]): void => {
  const mimeType =
    (item.file?.mime_type as keyof typeof fileExtensionMimeTypeMap) ||
    fileExtensionMimeTypeMap.pdf
  if (item.file?.file_url) {
    content.push({
      type: 'document',
      source: {
        type: 'url',
        url: item.file.file_url,
      },
    })
    return
  }

  if (item.file?.file_data) {
    const contentType = mimeType === fileExtensionMimeTypeMap.txt ? 'text' : 'base64'
    content.push({
      type: 'document',
      source: {
        type: contentType,
        data: item.file.file_data,
        media_type: mimeType,
      },
    })
  }
}

const transformAssistantMessage = (msg: any): any => {
  const transformedContent: any[] = []
  const inputContent = msg.content_blocks ?? msg.content

  if (typeof inputContent === 'string') {
    transformedContent.push({ type: 'text', text: inputContent })
  } else if (Array.isArray(inputContent)) {
    inputContent.forEach((item) => {
      if (item.type === 'tool_use') return
      transformedContent.push(item)
    })
  }

  if (Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
    msg.tool_calls.forEach((toolCall: any) => {
      let parsedInput = {}
      if (toolCall.function?.arguments) {
        try {
          parsedInput = JSON.parse(toolCall.function.arguments)
        } catch {
          parsedInput = {}
        }
      }
      transformedContent.push({
        type: 'tool_use',
        name: toolCall.function?.name,
        id: toolCall.id,
        input: parsedInput,
        ...(toolCall.cache_control ? withEphemeralCache(true) : {}),
      })
    })
  }

  return {
    role: msg.role,
    content: transformedContent,
  }
}

const transformToolMessage = (msg: any): any => {
  const toolUseId = msg.tool_call_id ?? ''
  return {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: msg.content,
      },
    ],
  }
}

const transformMessagesToAnthropic = (messages: any[] = []): { system?: any[]; messages: any[] } => {
  const systemMessages: any[] = []
  const transformedMessages: any[] = []

  messages.forEach((msg: any) => {
    if (!msg || typeof msg !== 'object') return

    if (SYSTEM_MESSAGE_ROLES.has(msg.role)) {
      if (typeof msg.content === 'string') {
        systemMessages.push({
          text: msg.content,
          type: 'text',
          ...(msg.cache_control ? withEphemeralCache(true) : {}),
        })
      } else if (Array.isArray(msg.content)) {
        msg.content.forEach((item: any) => {
          if (item?.text) {
            systemMessages.push({
              text: item.text,
              type: 'text',
              ...(item.cache_control ? withEphemeralCache(true) : {}),
            })
          }
        })
      }
      return
    }

    if (msg.role === 'assistant') {
      transformedMessages.push(transformAssistantMessage(msg))
      return
    }

    if (msg.role === 'tool') {
      transformedMessages.push(transformToolMessage(msg))
      return
    }

    if (Array.isArray(msg.content)) {
      const transformedMessage = {
        role: msg.role,
        content: [] as any[],
      }
      msg.content.forEach((item: any) => {
        if (item.type === 'text') {
          transformedMessage.content.push({
            type: 'text',
            text: item.text,
            ...(item.cache_control ? withEphemeralCache(true) : {}),
          })
        } else if (item.type === 'image_url') {
          transformAndAppendImageContentItem(item, transformedMessage.content)
        } else if (item.type === 'file') {
          transformAndAppendFileContentItem(item, transformedMessage.content)
        }
      })
      transformedMessages.push(transformedMessage)
      return
    }

    transformedMessages.push({
      role: msg.role,
      content: msg.content,
    })
  })

  return {
    system: systemMessages.length ? systemMessages : undefined,
    messages: transformedMessages,
  }
}

const transformToolsToAnthropic = (tools?: any[]): any[] | undefined => {
  if (!Array.isArray(tools) || !tools.length) return undefined
  return tools.map((tool) => {
    if (tool.type !== 'function') return tool
    const parameters = tool.function?.parameters ?? {}
    return {
      name: tool.function?.name,
      description: tool.function?.description,
      input_schema: {
        type: parameters.type ?? 'object',
        properties: parameters.properties ?? {},
        required: parameters.required ?? [],
      },
      ...(tool.defer_loading ? { defer_loading: tool.defer_loading } : {}),
      ...(tool.allowed_callers ? { allowed_callers: tool.allowed_callers } : {}),
      ...(tool.input_examples ? { input_examples: tool.input_examples } : {}),
    }
  })
}

const transformToolChoiceToAnthropic = (toolChoice?: any): any => {
  if (!toolChoice) return undefined
  if (toolChoice === 'required') return { type: 'any' }
  if (toolChoice === 'auto') return { type: 'auto' }
  if (toolChoice === 'none') return { type: 'none' }

  const toolName =
    toolChoice?.function?.name || toolChoice?.tool?.name || toolChoice?.name
  if (toolName) {
    return { type: 'tool', name: toolName }
  }
  return undefined
}

const normalizeStopSequences = (stop?: string | string[]): string[] | undefined => {
  if (!stop) return undefined
  if (Array.isArray(stop)) return stop
  return [stop]
}

const transformToAnthropic = (body: any): any => {
  const { system, messages } = transformMessagesToAnthropic(body.messages ?? [])
  const tools = transformToolsToAnthropic(body.tools)
  const toolChoice = transformToolChoiceToAnthropic(body.tool_choice)

  return {
    model: body.model,
    max_tokens: body.max_tokens ?? body.max_completion_tokens ?? 1024,
    messages,
    ...(system ? { system } : {}),
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.top_p !== undefined ? { top_p: body.top_p } : {}),
    ...(body.top_k !== undefined ? { top_k: body.top_k } : {}),
    ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
    ...(body.user !== undefined ? { user: body.user } : {}),
    ...(body.thinking !== undefined ? { thinking: body.thinking } : {}),
    ...(body.stream !== undefined ? { stream: body.stream } : {}),
    ...(normalizeStopSequences(body.stop) ? { stop_sequences: normalizeStopSequences(body.stop) } : {}),
    ...(tools ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
  }
}

const mapStopReason = (reason?: string): string | null => {
  if (!reason) return null
  switch (reason) {
    case 'max_tokens':
      return 'length'
    case 'tool_use':
      return 'tool_calls'
    case 'end_turn':
    case 'stop_sequence':
    default:
      return 'stop'
  }
}

const transformToOpenAI = (response: any): any => {
  const contentBlocks = Array.isArray(response?.content) ? response.content : []
  const text = contentBlocks
    .map((block: any) => (block?.type === 'text' ? block.text : ''))
    .join('')
  const toolCalls = contentBlocks
    .filter((block: any) => block?.type === 'tool_use')
    .map((block: any, index: number) => ({
      id: block.id ?? `tool_${index}`,
      type: 'function',
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input ?? {}),
      },
    }))

  const promptTokens = response?.usage?.input_tokens ?? 0
  const completionTokens = response?.usage?.output_tokens ?? 0
  const cacheCreateTokens = response?.usage?.cache_creation_input_tokens ?? 0
  const cacheReadTokens = response?.usage?.cache_read_input_tokens ?? 0
  const totalTokens =
    promptTokens + completionTokens + cacheCreateTokens + cacheReadTokens

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
          ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: mapStopReason(response?.stop_reason),
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      ...(cacheCreateTokens || cacheReadTokens
        ? {
            prompt_tokens_details: {
              cached_tokens: cacheCreateTokens + cacheReadTokens,
            },
          }
        : {}),
    },
  }
}

const buildAnthropicHeaders = (
  request: FastifyRequest,
  apiKey: string,
  version: string,
  beta: string
): Headers => {
  const headers = buildProxyHeaders(request.headers, apiKey)
  headers.delete('authorization')
  headers.set('X-API-Key', apiKey)
  headers.set('anthropic-version', version)
  headers.set('anthropic-beta', beta)
  headers.set('content-type', 'application/json')
  return headers
}

const getAnthropicConfigFromBody = (body: any): { version?: string; beta?: string } => {
  if (!body || typeof body !== 'object') return {}
  return {
    version: body.anthropic_version,
    beta: body.anthropic_beta,
  }
}

const createOpenAIChunk = (payload: any): string => {
  return `data: ${JSON.stringify(payload)}\n\n`
}

const buildOpenAIChunk = (
  id: string,
  model: string,
  delta: any,
  finishReason: string | null = null,
  usage?: any
): any => {
  return {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
        ...(usage ? { usage } : {}),
      },
    ],
  }
}

const streamAnthropicToOpenAI = async (
  response: Response,
  reply: FastifyReply
): Promise<void> => {
  if (!response.body) {
    reply.internalServerError('Anthropic response missing body')
    return
  }

  reply.hijack()
  reply.raw.setHeader('content-type', 'text/event-stream')
  reply.raw.setHeader('cache-control', 'no-cache')
  reply.raw.setHeader('connection', 'keep-alive')

  const decoder = new TextDecoder()
  let buffer = ''
  let model = 'anthropic'
  let messageId = 'anthropic-stream'
  let toolIndex = 0

  const writeChunk = (payload: any) => {
    reply.raw.write(createOpenAIChunk(payload))
  }

  const handleEvent = (event: string, data: any) => {
    if (event === 'message_start') {
      messageId = data?.message?.id ?? messageId
      model = data?.message?.model ?? model
      writeChunk(buildOpenAIChunk(messageId, model, { role: 'assistant' }, null))
      return
    }

    if (event === 'content_block_start') {
      if (data?.content_block?.type === 'tool_use') {
        const toolCall = {
          index: toolIndex,
          id: data.content_block.id,
          type: 'function',
          function: {
            name: data.content_block.name,
            arguments: '',
          },
        }
        writeChunk(buildOpenAIChunk(messageId, model, { tool_calls: [toolCall] }, null))
        toolIndex += 1
      }
      return
    }

    if (event === 'content_block_delta') {
      if (data?.delta?.type === 'text_delta') {
        writeChunk(buildOpenAIChunk(messageId, model, { content: data.delta.text }, null))
        return
      }
      if (data?.delta?.type === 'input_json_delta') {
        const toolCall = {
          index: Math.max(toolIndex - 1, 0),
          type: 'function',
          function: {
            arguments: data.delta.partial_json ?? '',
          },
        }
        writeChunk(buildOpenAIChunk(messageId, model, { tool_calls: [toolCall] }, null))
      }
      return
    }

    if (event === 'message_delta') {
      const finishReason = mapStopReason(data?.delta?.stop_reason)
      writeChunk(buildOpenAIChunk(messageId, model, {}, finishReason))
      return
    }

    if (event === 'message_stop') {
      reply.raw.write('data: [DONE]\n\n')
      return
    }

    if (event === 'error') {
      writeChunk({ error: data })
    }
  }

  const stream = Readable.fromWeb(response.body as any)
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk as Buffer, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const lines = part.split('\n')
      let event = ''
      let dataLine = ''
      for (const line of lines) {
        if (line.startsWith('event:')) {
          event = line.replace('event:', '').trim()
        } else if (line.startsWith('data:')) {
          dataLine = line.replace('data:', '').trim()
        }
      }
      if (!dataLine) continue
      try {
        const data = JSON.parse(dataLine)
        handleEvent(event, data)
      } catch {
        continue
      }
    }
  }

  reply.raw.end()
}

export const proxyAnthropic = async (
  request: FastifyRequest,
  reply: FastifyReply,
  path: string
): Promise<void> => {
  const { apiKey, version, beta } = INTERNAL_PROVIDER_CONFIG.anthropic
  if (!apiKey) {
    reply.internalServerError('Anthropic API key not configured')
    return
  }

  if (path !== '/v1/chat/completions') {
    reply.badRequest('Unsupported anthropic path')
    return
  }

  const body = (request.body ?? {}) as any
  const { version: bodyVersion, beta: bodyBeta } = getAnthropicConfigFromBody(body)
  const targetUrl = buildTargetUrl(request, path)
  const headers = buildAnthropicHeaders(
    request,
    apiKey,
    bodyVersion ?? version,
    bodyBeta ?? beta
  )

  const isStreaming = Boolean(body?.stream)

  const cleanedBody = { ...body }
  delete cleanedBody.anthropic_beta
  delete cleanedBody.anthropic_version

  const payload = transformToAnthropic(cleanedBody)

  let response: Response
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  } catch (error) {
    reply.internalServerError(`Anthropic request failed: ${(error as Error).message}`)
    return
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    reply.status(response.status).send(errorPayload ?? { error: 'Anthropic request failed' })
    return
  }

  if (isStreaming) {
    await streamAnthropicToOpenAI(response, reply)
    return
  }

  const responseJson = await response.json().catch(() => null)
  reply.status(200).send(transformToOpenAI(responseJson))
}
