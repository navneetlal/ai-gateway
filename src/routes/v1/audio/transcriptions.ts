import { FastifyPluginAsync } from 'fastify'

import { handleProviderRequest } from '../../../providers/provider-router'
import { audioTranscriptionsSchema } from '../../../validation/schemas'
import { validateJsonBody } from '../../../validation/validate'

const transcriptions: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/transcriptions', async function (request, reply) {
    if (!validateJsonBody(request, reply, audioTranscriptionsSchema, { allowEmpty: true })) {
      return
    }

    return handleProviderRequest(request, reply)
  })
}

export default transcriptions
