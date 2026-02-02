import { FastifyPluginAsync } from 'fastify'

import { handleProviderRequest } from '../../providers/provider-router'
import { embeddingsSchema } from '../../validation/schemas'
import { validateJsonBody } from '../../validation/validate'

const embeddings: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/embeddings', async function (request, reply) {
    if (!validateJsonBody(request, reply, embeddingsSchema)) {
      return
    }

    return handleProviderRequest(request, reply)
  })
}

export default embeddings
