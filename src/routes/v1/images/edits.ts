import { FastifyPluginAsync } from 'fastify'

const edits: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post('/edits', async function () {
    return { ok: true }
  })
}

export default edits
