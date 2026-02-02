import { FastifyPluginAsync } from 'fastify'

import { handleProviderRequest } from '../../../providers/provider-router'
import { imageGenerationsSchema } from '../../../validation/schemas'
import { validateJsonBody } from '../../../validation/validate'

const generations: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/generations', async function (request, reply) {
    if (!validateJsonBody(request, reply, imageGenerationsSchema)) {
      return
    }

    return handleProviderRequest(request, reply, '/images/generations')
  })
}

export default generations
