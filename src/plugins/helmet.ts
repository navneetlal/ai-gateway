import fp from 'fastify-plugin'
import helmet, { FastifyHelmetOptions } from '@fastify/helmet'

/**
 * This plugin helps secure HTTP headers.
 *
 * @see https://github.com/fastify/fastify-helmet
 */
export default fp<FastifyHelmetOptions>(async (fastify) => {
  fastify.register(helmet)
})
