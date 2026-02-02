import { FastifyPluginAsync } from 'fastify'

const models: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/models', async function () {
    return {
      object: 'list',
      data: []
    }
  })
}

export default models
