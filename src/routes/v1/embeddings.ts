import { FastifyPluginAsync } from 'fastify'

const embeddings: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/embeddings', async function () {
    return { ok: true }
  })
}

export default embeddings
