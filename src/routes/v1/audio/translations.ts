import { FastifyPluginAsync } from 'fastify'

import { handleProviderRequest } from '../../../providers/provider-router'
import { audioTranslationsSchema } from '../../../validation/schemas'
import { validateJsonBody } from '../../../validation/validate'

const translations: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/translations', async function (request, reply) {
    if (!validateJsonBody(request, reply, audioTranslationsSchema, { allowEmpty: true })) {
      return
    }

    return handleProviderRequest(request, reply, '/audio/translations')
  })
}

export default translations
