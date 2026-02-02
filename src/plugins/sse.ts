import fp from 'fastify-plugin'
import sse, { SSEPluginOptions } from '@fastify/sse'

/**
 * This plugin adds Server-Sent Events (SSE) support.
 *
 * @see https://github.com/fastify/fastify-sse-v2
 */
export default fp<SSEPluginOptions>(async (fastify) => {
  fastify.register(sse)
})
