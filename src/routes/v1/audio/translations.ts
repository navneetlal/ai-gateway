import { FastifyPluginAsync } from 'fastify'

const translations: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/translations', async function () {
    return { ok: true }
  })
}

export default translations
