import { FastifyPluginAsync } from 'fastify'

const speech: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/speech', async function () {
    return { ok: true }
  })
}

export default speech
