/**
 * Every function of the store, with arguments that make it do its work.
 *
 * All of them and not only the ones that write progress today. Two suites
 * walk this table and check it against the store itself, so an action a later
 * lot adds cannot reach a player without having been run:
 *
 *   - `test:save`, against a save that holds fields this build does not know;
 *   - `test:triggers`, against a save with a consequence still owed: an
 *     action either leaves the save alone or leaves it settled.
 *
 * Each entry stands alone: it sets up what it needs, so the order they run
 * in is not part of what they prove.
 */

type StoreState = ReturnType<(typeof import('../../src/state/store.ts'))['useMuseum']['getState']>

const PORTER = { deviceId: 'office-radio', speakerKey: 'radio.speaker.porter' } as const

export const STORE_ACTIONS: Record<string, (state: StoreState) => void> = {
  setSetting: (state) => state.setSetting('brightness', 1.2),
  start: (state) => state.start(),
  setPointerLocked: (state) => state.setPointerLocked(true),
  setSceneReady: (state) => state.setSceneReady(true),
  setCurrentRoom: (state) => state.setCurrentRoom('holyoke'),
  setVisibleRooms: (state) => state.setVisibleRooms(['holyoke', 'atrium']),
  setTouchMove: (state) => state.setTouchMove(1, 0),
  setTouchLook: (state) => state.setTouchLook(0, 1),
  resetTouch: (state) => state.resetTouch(),
  setFocusedExhibit: (state) => state.setFocusedExhibit('ball-spalding'),
  setFocusedContainer: (state) => state.setFocusedContainer('office-notebook', 1),
  setFocusedPowerControl: (state) => state.setFocusedPowerControl('office-lamp-switch', 1),
  setFocusedTransitionDoor: (state) =>
    state.setFocusedTransitionDoor({ id: 'atrium-to-office', targetRoom: 'atrium', status: 'ready', armed: false }),
  setOpenedContainer: (state) => state.setOpenedContainer('office-notebook'),
  setActiveLock: (state) => state.setActiveLock('office-drawer'),
  setExamining: (state) => state.setExamining('ball-spalding'),
  setFocusedDevice: (state) => state.setFocusedDevice('office-radio', 1),
  toggleFlashlight: (state) => state.toggleFlashlight(),
  setNotebookPage: (state) => state.setNotebookPage(2),
  setJournalTab: (state) => state.setJournalTab('map'),
  startRadio: (state) => state.startRadio({ ...PORTER, lineKeys: ['a', 'b'] }),
  // The last line of a call: this is the write that records it as heard.
  advanceRadio: (state) => {
    state.startRadio({ ...PORTER, lineKeys: ['a'], callId: 'call-heard-out' })
    state.advanceRadio()
  },
  dropRadio: (state) => {
    state.startRadio({ ...PORTER, lineKeys: ['a', 'b'], callId: 'call-cut-short' })
    state.dropRadio()
  },
  stopRadio: (state) => state.stopRadio(),
  clearRadioHangUp: (state) => state.clearRadioHangUp(),
  // A directed sequence: put on screen, seen to its last step (the write
  // that records it as shown), and taken off with steps unseen (no record).
  startSequence: (state) => state.startSequence('sequence-started', 2),
  advanceSequence: (state) => {
    state.startSequence('sequence-seen-out', 1)
    state.advanceSequence()
  },
  stopSequence: (state) => {
    state.startSequence('sequence-cut-short', 2)
    state.advanceSequence()
    state.stopSequence()
  },
  recordHotspot: (state) => state.recordHotspot('handbook-1897', 'innings'),
  recordCatalogued: (state) => state.recordCatalogued('handbook-1897'),
  recordDocument: (state) => state.recordDocument('doc-rule-changes'),
  recordFact: (state) => state.recordFact('first-rulebook'),
  grantCredential: (state) => state.grantCredential('tool:screwdriver'),
  powerRoom: (state) => state.powerRoom('holyoke'),
  openLock: (state) => state.openLock('atrium-plinth'),
  recordRadioCall: (state) => state.recordRadioCall('call-recorded'),
  carryDevice: (state) => state.carryDevice('spare-radio'),
  rememberRadioCall: (state) =>
    state.rememberRadioCall('office-radio', {
      calls: 5,
      temper: 2,
      lastCallAt: 1791075960000,
      lastHint: 3,
      hintHeight: 1,
      lastReplyId: null,
      lastOutburstId: 'porter-outburst-kettle',
    }),
  recordClockSeconds: (state) => state.recordClockSeconds('office-clock', 700),
  recordHint: (state) => state.recordHint('torch-used'),
  // One of each list a verb or an effect writes, in the save's own spelling.
  grant: (state) =>
    state.grant({
      credentials: ['badge:archive'],
      locksOpened: ['effect-lock'],
      locksSeen: ['effect-lock', 'touched-lock'],
      doorsReleased: ['pushed-door'],
      roomsPowered: ['effect-room'],
      documentsRead: ['effect-document'],
      flags: ['effect-flag'],
      termsSigned: ['signed-term'],
    }),
}

/** What the actions above must have left in the save, beyond what it began with. */
export const STORE_ACTIONS_LEAVE = {
  roomsVisited: ['holyoke'],
  lastRoom: 'holyoke',
  radioCalls: ['call-heard-out', 'call-cut-short', 'call-recorded'],
  hotspots: ['handbook-1897:innings'],
  catalogued: ['handbook-1897'],
  documentsRead: ['doc-rule-changes', 'effect-document'],
  factsKnown: ['first-rulebook'],
  credentials: ['tool:screwdriver', 'badge:archive'],
  roomsPowered: ['holyoke', 'effect-room'],
  locksOpened: ['atrium-plinth', 'effect-lock'],
  // A lock that is open was touched, by whichever door it was opened.
  locksSeen: ['atrium-plinth', 'effect-lock', 'touched-lock'],
  doorsReleased: ['pushed-door'],
  flags: ['effect-flag'],
  devicesCarried: ['spare-radio'],
  hintsShown: ['torch-used'],
  termsSigned: ['signed-term'],
  // Only the one seen to its last step: started, or cut short, is not shown.
  sequencesSeen: ['sequence-seen-out'],
} as const
