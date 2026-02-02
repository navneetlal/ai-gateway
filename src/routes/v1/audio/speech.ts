import { FastifyPluginAsync } from 'fastify'

import { handleProviderRequest } from '../../../providers/provider-router'
import { audioSpeechSchema } from '../../../validation/schemas'
import { validateJsonBody } from '../../../validation/validate'

const speech: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/speech', async function (request, reply) {
    if (!validateJsonBody(request, reply, audioSpeechSchema)) {
      return
    }

    return handleProviderRequest(request, reply, '/audio/speech')
  })
}

export default speech
