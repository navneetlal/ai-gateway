import { FastifyPluginAsync } from 'fastify'

const models: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/models', async function () {
    return { ok: true }
  })
}

export default models
