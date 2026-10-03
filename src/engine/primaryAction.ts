export type PrimaryActionHandler = () => boolean

type RegisteredHandler = Readonly<{
  handler: PrimaryActionHandler
  priority: number
  order: number
}>

const handlers: RegisteredHandler[] = []
let nextOrder = 0

/**
 * Registers one consumer of the shared “interact” intent.
 *
 * Keyboard and touch must enter the same gameplay path. Priorities mirror the
 * HUD targeting rules: a transition door wins over an exhibit, which wins over
 * furniture, which wins over a power control behind it.
 */
export function subscribePrimaryAction(
  handler: PrimaryActionHandler,
  priority = 0,
) {
  const record = { handler, priority, order: nextOrder } satisfies RegisteredHandler
  nextOrder += 1
  handlers.push(record)
  handlers.sort((first, second) => second.priority - first.priority || first.order - second.order)

  return () => {
    const index = handlers.indexOf(record)
    if (index >= 0) handlers.splice(index, 1)
  }
}

/** Runs at most one context-appropriate interaction. */
export function triggerPrimaryAction() {
  // A handler may synchronously unmount its owner, so iterate over a snapshot.
  for (const { handler } of [...handlers]) {
    if (handler()) return true
  }
  return false
}

/**
 * True for an E press that no other system has already acted on.
 *
 * Every system listens to E on `window`, and every listener runs for the same
 * event, each re-reading the store the previous one may just have changed. One
 * press could light the lamp and then — the radio now live — let the radio take
 * the same press and leave the desk. The first system that acts calls
 * `preventDefault`; the rest stand down, which is what `triggerPrimaryAction`
 * already guarantees on touch.
 */
export function isUnclaimedInteractKey(event: Pick<KeyboardEvent, 'code' | 'defaultPrevented'>) {
  return event.code === 'KeyE' && !event.defaultPrevented
}
