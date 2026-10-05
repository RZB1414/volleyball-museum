/**
 * Tabs that are alive: several pages of the real store over one storage.
 *
 * The pages the other suites open (`storePage.ts`, and the ones of
 * `test-save.ts`) have a timer that never fires, and hear of another tab's
 * write only when a test says so. That is the right page for asking what one
 * forced write leaves on the disk, and the wrong one for asking what two tabs
 * do to each other: the write a tab schedules when it hears of another tab's
 * never ran in any suite. It was that write, answered by the same write in
 * the other tab, that kept two tabs standing in two rooms writing the save at
 * each other for as long as both were open.
 *
 * Here a browser has one storage and any number of tabs, and does the two
 * things a real one does between them:
 *
 *   - a write tells every OTHER tab (the `storage` event), and only when the
 *     text under the key changed;
 *   - a timer the store asked for fires.
 *
 * Neither happens by itself. `settle` runs rounds of "every tab hears what it
 * was told, then runs its timers" until nobody has anything left to do, under
 * a ceiling, and says how many writes each round made. A suite can also
 * deliver one tab's events or fire one tab's timers alone, in whatever order
 * a dice chooses: a browser promises no order between two tabs either.
 *
 * The store reads `window`, `document` and `localStorage` off the global
 * object as it goes, so every act of a tab is made with that tab's page in
 * place. Opening a browser puts its storage there; the storage a suite had
 * before is the suite's to put back (`close` does).
 */

export const STORAGE_KEY = 'volleyball-museum:v1'

type StoreModule = typeof import('../../src/state/store.ts')
type StoreState = ReturnType<StoreModule['useMuseum']['getState']>
type Raw = Record<string, unknown>

/** How the page lets the store put a write off: both ways are in the store, and browsers differ. */
export type PageKind = 'timeout' | 'idle'

export type LiveTab = {
  readonly name: string
  readonly store: StoreModule
  state: () => StoreState
  progress: () => StoreState['progress'] & Raw
  /** Something the player does in this tab. */
  act: <T>(run: (state: StoreState) => T) => T
  /** The browser tells this tab of every write it has not heard of yet; how many there were. */
  hear: () => number
  /** Every timer the store has asked this page for fires; how many there were. */
  runTimers: () => number
  /** The player looks at another tab, and comes back. */
  hide: () => void
  show: () => void
  /** The tab is closed: it writes what it has left to write, and is gone. */
  close: () => void
}

let loads = 0

/** A browser with this under the save key (a string is stored as it is), and no tab open yet. */
export function openBrowser(save?: unknown) {
  const asText = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value))
  const storage = new Map<string, string>()
  if (save !== undefined) storage.set(STORAGE_KEY, asText(save))

  type Page = LiveTab & { readonly window: EventTarget; readonly document: EventTarget; readonly told: (string | null)[] }
  const tabs: Page[] = []
  /** Every `setItem`, in order: who wrote, and what. */
  const writes: { readonly by: string; readonly text: string }[] = []
  let acting: Page | null = null

  const tellTheOthers = (key: string | null) => {
    for (const tab of tabs) if (tab !== acting) tab.told.push(key)
  }
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      const before = storage.get(key)
      storage.set(key, value)
      writes.push({ by: acting?.name ?? 'nobody', text: value })
      // The same text again is no event: a browser says nothing of it.
      if (before !== value) tellTheOthers(key)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
  }
  const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: localStorage })

  const enter = (tab: Page) => {
    acting = tab
    Object.assign(globalThis, { window: tab.window, document: tab.document, localStorage })
  }

  async function open(name: string, kind: PageKind = 'timeout'): Promise<LiveTab> {
    const timers = new Map<number, () => void>()
    let handles = 0
    const ask = (run: () => void) => {
      handles += 1
      timers.set(handles, run)
      return handles
    }
    const drop = (handle: number) => {
      timers.delete(handle)
    }
    const window = Object.assign(new EventTarget(), {
      setTimeout: ask,
      clearTimeout: drop,
      ...(kind === 'idle' ? { requestIdleCallback: ask, cancelIdleCallback: drop } : {}),
    })
    const document = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    const told: (string | null)[] = []

    // The page is in place before the module is evaluated: the store reads
    // the save, and binds its listeners, as it is first imported.
    const page = { name, window, document, told } as Page
    tabs.push(page)
    enter(page)
    loads += 1
    const store = (await import(`../../src/state/store.ts?liveTab=${loads}`)) as StoreModule
    const state = () => store.useMuseum.getState()
    const visibility = (to: 'hidden' | 'visible') => {
      enter(page)
      document.visibilityState = to
      document.dispatchEvent(new Event('visibilitychange'))
    }
    return Object.assign(page, {
      store,
      state,
      progress: () => state().progress as StoreState['progress'] & Raw,
      act: <T>(run: (state: StoreState) => T) => {
        enter(page)
        return run(state())
      },
      hear: () => {
        enter(page)
        const keys = told.splice(0)
        for (const key of keys) window.dispatchEvent(Object.assign(new Event('storage'), { key }))
        return keys.length
      },
      runTimers: () => {
        enter(page)
        // Only the ones asked for by now: a timer may ask for another, and
        // that one belongs to the next round.
        const due = [...timers.entries()]
        for (const [handle, run] of due) {
          timers.delete(handle)
          run()
        }
        return due.length
      },
      hide: () => visibility('hidden'),
      show: () => visibility('visible'),
      close: () => {
        enter(page)
        window.dispatchEvent(new Event('pagehide'))
        // A closed tab hears nothing and no timer of its fires.
        tabs.splice(tabs.indexOf(page), 1)
        told.length = 0
        timers.clear()
      },
    } satisfies Omit<LiveTab, 'name'>)
  }

  /**
   * Every tab hears and runs its timers, round after round, until a round in
   * which nobody had anything to do. `quiet` is false when the ceiling came
   * first: the tabs were still at it.
   */
  function settle(ceiling = 12) {
    const rounds: number[] = []
    for (let round = 0; round < ceiling; round += 1) {
      const writesBefore = writes.length
      let work = 0
      for (const tab of [...tabs]) work += tab.hear() + tab.runTimers()
      if (work === 0) return { quiet: true, rounds }
      rounds.push(writes.length - writesBefore)
    }
    return { quiet: false, rounds }
  }

  return {
    open,
    settle,
    writes,
    tabs: tabs as readonly LiveTab[],
    /** The text under the save key, and what it parses to. */
    text: () => storage.get(STORAGE_KEY) ?? null,
    disk: () => JSON.parse(storage.get(STORAGE_KEY) ?? 'null') as ({ settings?: Raw; progress?: Raw } & Raw) | null,
    /**
     * A tab of a build this suite cannot run writes the save: the text is put
     * there, and every tab that is open is told.
     */
    anotherBuildWrites: (written: unknown) => {
      acting = null
      storage.set(STORAGE_KEY, asText(written))
      tellTheOthers(STORAGE_KEY)
    },
    /** The browser is gone, and the storage the suite had before it is back. */
    close: () => {
      tabs.length = 0
      if (before) Object.defineProperty(globalThis, 'localStorage', before)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    },
  }
}
export type LiveBrowser = ReturnType<typeof openBrowser>
