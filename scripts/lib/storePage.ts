/**
 * A browser tab, for a suite that needs the real store.
 *
 * The store reads the save once, as its module is first evaluated, and writes
 * it when the page is hidden. So a suite that wants to load a save, play and
 * read what reached the disk needs a storage in place before the import, a
 * fresh evaluation of the module per load and a `pagehide` to send. This is
 * that, shared by the suites of the progress rules (`test:triggers`,
 * `test:locks`).
 *
 * Importing this module puts the storage on `globalThis`: import it before
 * anything that reaches the store.
 */

export const STORAGE_KEY = 'volleyball-museum:v1'

const storage = new Map<string, string>()
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
  },
})

type StoreModule = typeof import('../../src/state/store.ts')
type Raw = Record<string, unknown>

/** What the storage would hand back: a copy with nothing shared and nothing but JSON in it. */
export const throughJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Frozen all the way down: code that writes into what it was handed throws. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner)
    Object.freeze(value)
  }
  return value
}

/** What none of the lists and records may lose between two moments. */
export function shrunk(before: Raw, after: Raw): string[] {
  const lost: string[] = []
  for (const [field, value] of Object.entries(before)) {
    const now = after[field]
    if (Array.isArray(value)) {
      for (const item of value) if (!Array.isArray(now) || !now.includes(item)) lost.push(`${field} lost ${JSON.stringify(item)}`)
    } else if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (!now || typeof now !== 'object' || !Object.hasOwn(now, key)) lost.push(`${field} lost its "${key}"`)
      }
    } else if (!Object.hasOwn(after, field)) {
      lost.push(`${field} is gone`)
    }
  }
  return lost
}

/** A seeded dice (mulberry32): a long random run that is the same every time. */
export function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

/** The same items in an order the dice chose. */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const order = [...items]
  for (let index = order.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))
    ;[order[index], order[other]] = [order[other], order[index]]
  }
  return order
}

/** A save as the storage holds it, with the player's settings left at their defaults. */
export const saveOf = (progress: Raw) => ({ settings: {}, progress })

/**
 * A browser opening the game with this under the save key (a string is stored
 * as it is).
 *
 * Each load gets a page of its own. The store binds its exit flush to the
 * `window` it finds, and a store left over from the load before must not
 * answer this page's `pagehide` with its own, older, progress. The page's
 * timers do not fire by themselves: the write a suite reads is the one
 * `leave` forces, which is the write a closing tab makes.
 */
let pageLoads = 0
export async function openGame(save?: unknown) {
  storage.clear()
  if (save !== undefined) storage.set(STORAGE_KEY, typeof save === 'string' ? save : JSON.stringify(save))
  const timers = new Map<number, () => void>()
  let handles = 0
  const page = Object.assign(new EventTarget(), {
    setTimeout: (run: () => void) => {
      handles += 1
      timers.set(handles, run)
      return handles
    },
    clearTimeout: (handle: number) => {
      timers.delete(handle)
    },
  })
  const tab = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  Object.assign(globalThis, { window: page, document: tab })
  pageLoads += 1
  const store = (await import(`../../src/state/store.ts?page=${pageLoads}`)) as StoreModule
  // Only this store can have asked for a write by now. Later on, a store left
  // over from an earlier page schedules on whatever `window` is current, which
  // is this one: running every timer would let it write its own save here.
  const askedAtBirth = [...timers.keys()]
  type Progress = ReturnType<StoreModule['useMuseum']['getState']>['progress']
  return {
    /** How many times a timer has been asked of this page: a write the store scheduled is one of them. */
    timersAsked: () => handles,
    /** The browser gets round to the write the store asked for as it was created, if it asked for one. */
    idleAfterBirth: () => {
      for (const handle of askedAtBirth) {
        const run = timers.get(handle)
        timers.delete(handle)
        run?.()
      }
    },
    store,
    state: () => store.useMuseum.getState(),
    progress: () => store.useMuseum.getState().progress as Progress & Raw,
    /** Puts this into the save behind the store's back: no action ran, so nothing was settled. */
    slip: (patch: Raw) => store.useMuseum.setState((state) => ({ progress: { ...state.progress, ...patch } })),
    /** How many times the store told its subscribers something changed while `act` ran. */
    notifications: (act: () => void) => {
      let count = 0
      const stop = store.useMuseum.subscribe(() => {
        count += 1
      })
      act()
      stop()
      return count
    },
    /** The tab goes away, and the store writes whatever it has not written yet. */
    leave: () => {
      page.dispatchEvent(new Event('pagehide'))
    },
    /** The text under the save key, and the progress in it. */
    savedText: () => storage.get(STORAGE_KEY) ?? null,
    savedProgress: () => (JSON.parse(storage.get(STORAGE_KEY) ?? '{}') as { progress?: Raw }).progress ?? null,
  }
}
export type GamePage = Awaited<ReturnType<typeof openGame>>

/**
 * A suite's `test`: records a failure and goes on. A change to a rule usually
 * breaks several checks at once, and the list of them is the diagnosis.
 */
export function suite(title: string) {
  let passed = 0
  let failed = 0
  console.log(`\n${title}`)
  return {
    async test(name: string, run: () => void | Promise<void>) {
      try {
        await run()
      } catch (error) {
        failed += 1
        console.log(`  FAIL  ${name}`)
        const message = error instanceof Error ? error.message : String(error)
        for (const line of message.split('\n')) console.log(`        ${line}`)
        return
      }
      passed += 1
      console.log(`  pass  ${name}`)
    },
    done(what: string) {
      console.log(`\n${passed}/${passed + failed} ${what} passed.\n`)
      if (failed > 0) process.exitCode = 1
    },
  }
}
