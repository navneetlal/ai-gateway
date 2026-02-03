import { FastifyBaseLogger } from 'fastify'
import ky, { Options } from 'ky'

import { CircuitBreaker } from './circuit-breaker'
import { getLogger } from './logger'

export type RetryOptions = {
  retries?: number
  minDelayMs?: number
  maxDelayMs?: number
  timeoutMs?: number
  retryOnStatusCodes?: number[]
  circuitBreaker?: CircuitBreaker
  logger?: FastifyBaseLogger
}

const DEFAULT_RETRY_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504])
const DEFAULT_RETRIES = 2
const DEFAULT_MIN_DELAY_MS = 250
const DEFAULT_MAX_DELAY_MS = 2000
const DEFAULT_TIMEOUT_MS = 60_000

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const computeDelay = (attempt: number, minDelayMs: number, maxDelayMs: number): number => {
  const baseDelay = Math.min(maxDelayMs, minDelayMs * 2 ** (attempt - 1))
  const jitter = Math.random() * baseDelay * 0.2
  return Math.round(baseDelay + jitter)
}

const shouldRetryStatus = (status: number, retryOnStatusCodes?: number[]): boolean => {
  if (!retryOnStatusCodes) {
    return DEFAULT_RETRY_STATUS_CODES.has(status)
  }
  return retryOnStatusCodes.includes(status)
}

export const requestWithRetry = async (
  url: string,
  options: Options,
  retryOptions: RetryOptions = {}
): Promise<Response> => {
  const retries = retryOptions.retries ?? DEFAULT_RETRIES
  const minDelayMs = retryOptions.minDelayMs ?? DEFAULT_MIN_DELAY_MS
  const maxDelayMs = retryOptions.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
  const timeoutMs = retryOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const breaker = retryOptions.circuitBreaker
  const log = retryOptions.logger ?? getLogger()

  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (breaker && !breaker.canRequest()) {
      log.warn({ circuit: breaker.state.name, url }, 'Circuit breaker open, blocking request')
      throw new Error(`Circuit open for ${breaker.state.name}`)
    }

    try {
      if (attempt > 0) {
        log.debug({ attempt, url }, 'Retrying request')
      }

      const response = await ky(url, {
        ...options,
        timeout: timeoutMs,
        throwHttpErrors: false,
        retry: 0, // Disable ky's built-in retry, we handle retries ourselves
      })

      if (response.ok) {
        breaker?.onSuccess()
        if (attempt > 0) {
          log.info({ attempt, status: response.status, url }, 'Request succeeded after retry')
        }
        return response
      }

      breaker?.onFailure()

      if (!shouldRetryStatus(response.status, retryOptions.retryOnStatusCodes)) {
        log.debug({ status: response.status, url }, 'Non-retryable status code')
        return response
      }

      if (attempt >= retries) {
        log.warn({ attempt, status: response.status, url }, 'Request failed after all retries')
        return response
      }

      log.debug({ attempt, status: response.status, url }, 'Retryable status code, will retry')
      await response.arrayBuffer().catch(() => undefined)
    } catch (error) {
      lastError = error
      breaker?.onFailure()

      if (attempt >= retries) {
        log.error({ attempt, error: (error as Error).message, url }, 'Request failed with error after all retries')
        throw error
      }

      log.debug({ attempt, error: (error as Error).message, url }, 'Request error, will retry')
    }

    const delayMs = computeDelay(attempt + 1, minDelayMs, maxDelayMs)
    await sleep(delayMs)
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error('Request failed')
}
