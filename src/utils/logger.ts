import { FastifyBaseLogger } from 'fastify'

let globalLogger: FastifyBaseLogger | null = null

/**
 * Initialize the global logger with the Fastify instance logger.
 * Called once during app startup.
 */
export const initLogger = (logger: FastifyBaseLogger): void => {
  globalLogger = logger
}

/**
 * Get the global logger for use outside request context.
 * Use request.log when inside a route handler for request-scoped logging.
 */
export const getLogger = (): FastifyBaseLogger => {
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call initLogger() first.')
  }
  return globalLogger
}
