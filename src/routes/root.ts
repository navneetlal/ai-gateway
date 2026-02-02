import { FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function () {
    return 'AI Gateway says hey!'
  })
}

export default root
