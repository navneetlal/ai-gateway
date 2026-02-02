import { FastifyPluginAsync } from 'fastify'

const generations: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/generations', async function () {
    return { ok: true }
  })
}

export default generations
