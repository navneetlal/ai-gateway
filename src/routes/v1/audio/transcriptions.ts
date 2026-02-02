import { FastifyPluginAsync } from 'fastify'

const transcriptions: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/transcriptions', async function () {
    return { ok: true }
  })
}

export default transcriptions
