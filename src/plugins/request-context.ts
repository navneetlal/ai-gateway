import fp from 'fastify-plugin'
import requestContext, {
  FastifyRequestContextOptions
} from '@fastify/request-context'

/**
 * This plugin provides per-request context storage.
 *
 * @see https://github.com/fastify/fastify-request-context
 */
export default fp<FastifyRequestContextOptions>(async (fastify) => {
  fastify.register(requestContext)
})
