import ky, { Options } from 'ky'

export type RetryOptions = {
  retries?: number
  minDelayMs?: number
  maxDelayMs?: number
  retryOnStatusCodes?: number[]
}

const DEFAULT_RETRY_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504])
const DEFAULT_RETRIES = 2
const DEFAULT_MIN_DELAY_MS = 250
const DEFAULT_MAX_DELAY_MS = 2000

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

  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await ky(url, {
        ...options,
        throwHttpErrors: false,
      })

      if (!shouldRetryStatus(response.status, retryOptions.retryOnStatusCodes)) {
        return response
      }

      if (attempt >= retries) {
        return response
      }

      await response.arrayBuffer().catch(() => undefined)
    } catch (error) {
      lastError = error
      if (attempt >= retries) {
        throw error
      }
    }

    const delayMs = computeDelay(attempt + 1, minDelayMs, maxDelayMs)
    await sleep(delayMs)
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error('Request failed')
}
