import { FastifyPluginAsync } from 'fastify'

const completions: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/completions', async function () {
    return { ok: true }
  })
}

export default completions
