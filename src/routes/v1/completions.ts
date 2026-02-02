import { FastifyPluginAsync } from 'fastify'

import { handleProviderRequest } from '../../providers/provider-router'
import { completionsSchema } from '../../validation/schemas'
import { validateJsonBody } from '../../validation/validate'

const completions: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/completions', async function (request, reply) {
    if (!validateJsonBody(request, reply, completionsSchema)) {
      return
    }

    return handleProviderRequest(request, reply, '/completions')
  })
}

export default completions
