import { FastifyPluginAsync } from 'fastify'

import { handleProviderRequest } from '../../../providers/provider-router'
import { chatCompletionsSchema } from '../../../validation/schemas'
import { validateJsonBody } from '../../../validation/validate'

const completions: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/completions', async function (request, reply) {
    if (!validateJsonBody(request, reply, chatCompletionsSchema)) {
      return
    }

    return handleProviderRequest(request, reply)
  })
}

export default completions
