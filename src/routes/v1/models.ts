import { FastifyPluginAsync } from 'fastify'

import { handleProviderRequest } from '../../providers/provider-router'

const models: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/models', async function (request, reply) {
    return handleProviderRequest(request, reply)
  })
}

export default models
