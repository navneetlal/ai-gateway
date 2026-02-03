export type CircuitBreakerState = {
  enabled: boolean
  name: string
  closed: boolean
  open: boolean
  halfOpen: boolean
  warmUp: boolean
  shutdown: boolean
}

export type CircuitBreakerStatus = {
  failures: number
  successes: number
  consecutiveFailures: number
  consecutiveSuccesses: number
  openedAt?: number
  halfOpenAttempts: number
  lastFailureAt?: number
  lastSuccessAt?: number
}

export type CircuitBreakerSnapshot = {
  state: CircuitBreakerState
  status: CircuitBreakerStatus
  cooldownUntil?: number
  warmUpUntil?: number
}

export type CircuitBreakerConfig = {
  name: string
  enabled?: boolean
  failureThreshold?: number
  successThreshold?: number
  cooldownMs?: number
  halfOpenMaxAttempts?: number
  warmUpMs?: number
}

export type CircuitBreakerStore = {
  get: (name: string) => CircuitBreakerSnapshot | undefined
  set: (name: string, snapshot: CircuitBreakerSnapshot) => void
}

const DEFAULT_FAILURE_THRESHOLD = 5
const DEFAULT_SUCCESS_THRESHOLD = 2
const DEFAULT_COOLDOWN_MS = 10_000
const DEFAULT_HALF_OPEN_MAX_ATTEMPTS = 1

const now = (): number => Date.now()

class InMemoryCircuitBreakerStore implements CircuitBreakerStore {
  private readonly cache = new Map<string, CircuitBreakerSnapshot>()

  get(name: string): CircuitBreakerSnapshot | undefined {
    return this.cache.get(name)
  }

  set(name: string, snapshot: CircuitBreakerSnapshot): void {
    this.cache.set(name, snapshot)
  }
}

const defaultStore = new InMemoryCircuitBreakerStore()

const buildInitialSnapshot = (config: CircuitBreakerConfig): CircuitBreakerSnapshot => {
  const warmUpUntil = config.warmUpMs ? now() + config.warmUpMs : undefined
  return {
    state: {
      enabled: config.enabled ?? true,
      name: config.name,
      closed: true,
      open: false,
      halfOpen: false,
      warmUp: Boolean(warmUpUntil),
      shutdown: false,
    },
    status: {
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      halfOpenAttempts: 0,
    },
    cooldownUntil: undefined,
    warmUpUntil,
  }
}

export class CircuitBreaker {
  private snapshot: CircuitBreakerSnapshot
  private readonly store: CircuitBreakerStore
  private readonly config: Required<Omit<CircuitBreakerConfig, 'name'>> & Pick<CircuitBreakerConfig, 'name'>

  constructor(config: CircuitBreakerConfig, store: CircuitBreakerStore = defaultStore) {
    this.config = {
      name: config.name,
      enabled: config.enabled ?? true,
      failureThreshold: config.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD,
      successThreshold: config.successThreshold ?? DEFAULT_SUCCESS_THRESHOLD,
      cooldownMs: config.cooldownMs ?? DEFAULT_COOLDOWN_MS,
      halfOpenMaxAttempts: config.halfOpenMaxAttempts ?? DEFAULT_HALF_OPEN_MAX_ATTEMPTS,
      warmUpMs: config.warmUpMs ?? 0,
    }
    this.store = store
    this.snapshot = store.get(config.name) ?? buildInitialSnapshot(config)
    this.persist()
  }

  get state(): CircuitBreakerState {
    return { ...this.snapshot.state }
  }

  get status(): CircuitBreakerStatus {
    return { ...this.snapshot.status }
  }

  getSnapshot(): CircuitBreakerSnapshot {
    return {
      state: { ...this.snapshot.state },
      status: { ...this.snapshot.status },
      cooldownUntil: this.snapshot.cooldownUntil,
      warmUpUntil: this.snapshot.warmUpUntil,
    }
  }

  shutdown(): void {
    this.snapshot.state.shutdown = true
    this.snapshot.state.enabled = false
    this.persist()
  }

  enable(): void {
    this.snapshot.state.enabled = true
    this.snapshot.state.shutdown = false
    this.persist()
  }

  disable(): void {
    this.snapshot.state.enabled = false
    this.persist()
  }

  canRequest(): boolean {
    this.refresh()
    const { enabled, shutdown, open, halfOpen } = this.snapshot.state
    if (!enabled || shutdown) {
      return false
    }

    if (open) {
      const cooldownUntil = this.snapshot.cooldownUntil ?? 0
      if (now() >= cooldownUntil) {
        this.toHalfOpen()
        this.snapshot.status.halfOpenAttempts += 1
        this.persist()
        return true
      }
      return false
    }

    if (halfOpen) {
      if (this.snapshot.status.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        return false
      }
      this.snapshot.status.halfOpenAttempts += 1
      this.persist()
      return true
    }

    return true
  }

  onSuccess(): void {
    this.refresh()
    const status = this.snapshot.status
    status.successes += 1
    status.consecutiveSuccesses += 1
    status.consecutiveFailures = 0
    status.lastSuccessAt = now()

    if (this.snapshot.state.halfOpen) {
      if (status.consecutiveSuccesses >= this.config.successThreshold) {
        this.toClosed()
      } else {
        this.persist()
      }
      return
    }

    if (this.snapshot.state.open) {
      this.toHalfOpen()
      return
    }

    this.persist()
  }

  onFailure(): void {
    this.refresh()
    const status = this.snapshot.status
    status.failures += 1
    status.consecutiveFailures += 1
    status.consecutiveSuccesses = 0
    status.lastFailureAt = now()

    if (this.snapshot.state.halfOpen) {
      this.toOpen()
      return
    }

    if (status.consecutiveFailures >= this.config.failureThreshold) {
      this.toOpen()
      return
    }

    this.persist()
  }

  private refresh(): void {
    const latest = this.store.get(this.config.name)
    if (latest) {
      this.snapshot = latest
    }

    if (this.snapshot.state.warmUp && this.snapshot.warmUpUntil) {
      if (now() >= this.snapshot.warmUpUntil) {
        this.snapshot.state.warmUp = false
        this.snapshot.warmUpUntil = undefined
        this.persist()
      }
    }
  }

  private toOpen(): void {
    this.snapshot.state.closed = false
    this.snapshot.state.open = true
    this.snapshot.state.halfOpen = false
    this.snapshot.status.openedAt = now()
    this.snapshot.status.halfOpenAttempts = 0
    this.snapshot.cooldownUntil = now() + this.config.cooldownMs
    this.persist()
  }

  private toHalfOpen(): void {
    this.snapshot.state.closed = false
    this.snapshot.state.open = false
    this.snapshot.state.halfOpen = true
    this.persist()
  }

  private toClosed(): void {
    this.snapshot.state.closed = true
    this.snapshot.state.open = false
    this.snapshot.state.halfOpen = false
    this.snapshot.cooldownUntil = undefined
    this.snapshot.status.consecutiveFailures = 0
    this.snapshot.status.consecutiveSuccesses = 0
    this.snapshot.status.halfOpenAttempts = 0
    this.persist()
  }

  private persist(): void {
    this.store.set(this.config.name, this.snapshot)
  }
}

export const createCircuitBreaker = (
  config: CircuitBreakerConfig,
  store?: CircuitBreakerStore
): CircuitBreaker => new CircuitBreaker(config, store)
