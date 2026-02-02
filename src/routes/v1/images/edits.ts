import { FastifyPluginAsync } from 'fastify'

import { handleProviderRequest } from '../../../providers/provider-router'
import { imageEditsSchema } from '../../../validation/schemas'
import { validateJsonBody } from '../../../validation/validate'

const edits: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/edits', async function (request, reply) {
    if (!validateJsonBody(request, reply, imageEditsSchema, { allowEmpty: true })) {
      return
    }

    return handleProviderRequest(request, reply, '/images/edits')
  })
}

export default edits
