import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

const isMultipart = (contentType: string | undefined): boolean => {
  if (!contentType) return false
  return contentType.toLowerCase().includes('multipart/form-data')
}

export const validateJsonBody = (
  request: FastifyRequest,
  reply: FastifyReply,
  schema: z.ZodTypeAny,
  options: { allowEmpty?: boolean } = {}
): boolean => {
  const contentType = request.headers['content-type']

  if (typeof contentType === 'string' && isMultipart(contentType)) {
    return true
  }

  const body = request.body
  if (body === undefined || body === null) {
    if (options.allowEmpty) {
      return true
    }

    reply.badRequest('Request body required')
    return false
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const payload = {
      error: 'Invalid request body',
      details: parsed.error.issues,
    }
    reply.badRequest(payload as any)
    return false
  }

  request.body = parsed.data as any
  return true
}
