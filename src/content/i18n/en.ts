/**
 * en — typed against pt-BR, so a missing key is a compile error rather than a
 * blank plaque a player discovers.
 */

import type { TranslationKey } from './pt-BR'

export const en = {
  // ---------------------------------------------------------------------
  // Shell
  // ---------------------------------------------------------------------
  'ui.title': 'Volleyball Museum',
  'ui.subtitle': 'The history of world volleyball, one room at a time.',
  'ui.enter': 'Enter the museum',
  'ui.continue': 'Continue',
  'ui.newGame': 'New game',
  'ui.newGame.confirm': 'Confirm — erase all progress',
  'ui.lookHint': 'Click to look around',
  'ui.loading': 'Preparing the gallery…',
  'ui.settings': 'Settings',
  'ui.language': 'Language',
  'ui.brightness': 'Brightness',
  'ui.motion': 'Camera motion',
  'ui.motion.headbob': 'Head bob while walking',
  'ui.motion.fov': 'Field-of-view push when running',
  'ui.quality': 'Graphics quality',
  'ui.readingMode': 'Reading mode',
  'ui.credits': 'Credits and collection',
  'mobile.controls': 'Touch controls',
  'mobile.move': 'Movement stick',
  'mobile.look': 'Camera stick',
  'mobile.action': 'Action',
  'mobile.landscape.title': 'Rotate your device',
  'mobile.landscape.body':
    'The museum plays in landscape. Leave split-screen mode if necessary.',
  'mobile.landscape.activate': 'Enable landscape mode',
  'mobile.fullscreen.resume': 'Resume fullscreen',
  'mobile.fullscreen.install':
    'In this browser, use “Add to Home Screen” for a complete fullscreen experience.',
  'mobile.fullscreen.dismiss': 'Got it',
  'ui.torch': 'Torch',
  'ui.torch.on': 'Switch the torch off',
  'ui.torch.off': 'Switch the torch on',
  'ui.journal.open': 'Open the notebook',
  'journal.taken': 'You took the notebook',
  'journal.taken.keyboard': 'Tab opens the plan, the catalogue and the archive.',
  'journal.taken.touch': 'The notebook icon opens the plan, the catalogue and the archive.',
  'journal.tab.notebook': 'Notebook',
  'radio.taken': 'You took the radio',
  'radio.taken.keyboard': 'R calls the porter, from any room.',
  'radio.taken.touch': 'The radio icon calls the porter, from any room.',
  'ui.radio.hungUp': 'Jorge hung up. Try again in a moment.',

  'prompt.examine': 'Examine',
  'prompt.read': 'Read',
  'prompt.rotate': 'Drag to rotate',
  'prompt.locked': 'Locked',
  'prompt.unlock': 'Unlock',
  'prompt.close': 'Close',
  'prompt.power': 'Restore power',
  'prompt.door.open': 'Open door',
  'prompt.door.loading': 'Preparing the next gallery…',
  'prompt.door.opening': 'Opening…',
  'prompt.door.otherSide': 'Opens from the other side',
  'prompt.door.unpowered': 'The lock has no power',
  'prompt.radio.call': 'Call the porter',
  'prompt.radio.dead': 'Not charging',
  'prompt.radio.take': 'Take the radio',
  'prompt.clock.set': 'Set the clock',
  'prompt.voice.play': 'Listen',
  'prompt.voice.again': 'Listen again',
  'prompt.voice.dead': 'No power',
  'power.restored': 'Power restored',
  'door.released': 'Shortcut unlocked',
  'radio.skip': 'Skip',
  'notebook.next': 'Turn the page',
  'notebook.previous': 'Back',
  'reader.next': 'Next',
  // Followed by the name of what was taken: "You took — Key to the iron safe".
  'credential.taken': 'You took',
  'credential.service-key.title': 'Key to the iron safe',
  'checklist.noted': 'Noted in your notebook',
  // The signing desk. A term is a deed here: "Hold E — Sign: Deed of office".
  'desk.sign': 'Sign',
  'desk.hold.keyboard': 'Hold E',
  'desk.hold.touch': 'Hold Action',
  'desk.cancel': 'Cancel',
  'desk.missing.power': 'no light yet in',
  'desk.missing.document': 'missing',
  'desk.signed': 'signed',
  'term.signed': 'Signed by the curator.',
  'journal.terms.heading': 'Deeds signed',

  'map.title': 'Museum plan',
  'map.state.unlit': 'No power',
  'map.state.partial': 'Lit, something left to check',
  'map.state.complete': 'Complete',
  'map.legend': 'Legend',
  'map.unknown': 'A room not visited yet',
  'map.north': 'North',
  'map.you': 'You are here',

  'catalogue.title': 'Catalogue',
  'catalogue.empty': 'Nothing catalogued yet. Examine an object and turn it over in your hands.',
  'catalogue.incomplete': 'Seen, but not catalogued. Turn it over.',
  'journal.title': "Curator's notebook",
  'archive.title': 'Archive',
  'archive.empty': 'No documents found yet. Look in drawers and filing cabinets.',
  'archive.filed': 'Filed in your notebook — Tab to re-read',
  'archive.filed.touch': 'Filed in your notebook — tap the notebook icon to re-read',
  'archive.filed.noJournal': "It will be filed in the curator's notebook, still on the office desk.",
  'container.office.title': "Otávio's drawer",
  // A term is a deed in English, and the book they are signed in the Book
  // of Deeds. The safe in the office is "the iron safe", the Founder's is
  // "the vault"; the accession ledger is the book the insurer wants.
  'document.otavio-handover.title': 'Handover of the collection — sheet 1',
  'document.otavio-handover.body':
    'HANDOVER OF THE COLLECTION — SHEET 1. If you are reading this you found the year, which means you read instead of walking past. Good. The key pinned to this sheet is for the iron safe in this room. Inside it is what I owed you in person: the Book of Deeds. Sign the deed of office once the house is lit. The accession ledger, the one the insurer wants to see, is not in there: it is kept in the Founder\'s vault, beneath the atrium, and no number and no key will take you to it. Check the collection without hurry: pick each piece up, turn it over, read what is written on it. — O.',
  'container.office-safe.title': 'Iron safe',
  'document.termos.title': 'Book of Deeds',
  'document.termos.summary': 'The book in which each curator signs for what is handed over.',
  'document.termos.handover':
    'DEED OF HANDOVER. I hand over the collection of the Volleyball Museum, checked as far as the rain allowed.',
  'document.termos.handover.signature': '— Otávio',
  'term.posse.title': 'Deed of office',
  'term.posse.body': 'DEED OF OFFICE. I receive the collection and the house, lit in its three rooms.',
  'document.label-proof-office.title': 'Label proof — the new plaques',
  'document.label-proof-office.body':
    'PRINTER\'S PROOF — THE NEW PLAQUES. Clipped to it, in the director\'s hand: “Otávio, they look lovely! Forty words each, as you asked. I only cut the bottom line: original, reconstruction, replica… Visitors don\'t need that to be charmed. We\'ll see about it after the reopening! — H.” Underneath, in red pencil: “They do. It is the one line I cannot write any other way. I am keeping this proof until the new curator decides. — O.”',
  'lock.title': 'Combination lock',
  'lock.prompt': 'Four digits',
  'lock.submit': 'Open',
  'lock.wrong': 'It does not give.',
  'lock.opened': 'The drawer yields.',
  'lock.hint.source': 'You saw this somewhere in Wing 1.',
  'credits.note':
    'Every image in this museum is public domain or Creative Commons licensed. Each is credited here and beneath the work itself in the gallery.',
  'credits.source': 'Source',
  'credits.licence': 'Licence',
  'container.holyoke-a.title': 'Archive — provenance',
  'container.holyoke-b.title': 'Archive — rules',

  'intro.line1': 'You are the new curator.',
  'intro.line2': 'It is the night before reopening. The power is out.',
  'intro.line3': 'Your predecessor left something in the vault.',

  // ---------------------------------------------------------------------
  // Rooms
  // ---------------------------------------------------------------------
  'room.atrium.title': 'Atrium',
  'room.atrium.nickname': 'the hall with the plinth',
  'room.atrium.sign.eyebrow': 'WAYFINDING',
  'room.atrium.sign.title': 'CENTRAL ATRIUM',
  'room.holyoke.title': 'Wing 1 · Holyoke',
  'room.holyoke.subtitle': '1895 – 1929',
  'room.holyoke.nickname': 'the room with the laced ball',
  'room.holyoke.sign.eyebrow': 'WING 01 · ORIGINS',
  'room.holyoke.sign.title': 'HOLYOKE',
  'room.office.title': "Curator's office",
  'room.office.nickname': 'the room with the green lamp',
  'room.office.sign.eyebrow': 'COLLECTIONS · RESEARCH',
  'room.office.sign.title': "CURATOR'S OFFICE",
  'power.atrium.title': 'Atrium main breaker',
  'power.holyoke.title': 'Wing 1 breaker panel',
  'power.office.title': "Curator's lamp",

  // ---------------------------------------------------------------------
  // The opening: the curator's office at night
  // ---------------------------------------------------------------------
  'container.office-notebook.title': "Curator's notebook",
  'document.welcome.title': "The director's welcome",
  'document.welcome.summary':
    "The first pages of the notebook, left on the desk for the new curator.",
  'notebook.welcome.flyleaf':
    'Welcome to the Volleyball Museum, where history is told in a way you can touch.',
  'notebook.welcome.letter':
    'Hello, new curator! Welcome to your new job.\n\n' +
    "This afternoon's storm knocked out the power across the whole museum, and you will have to bring it back room by room.\n\n" +
    'The insurer will only clear the reopening once you have checked the inventory yourself, against the accession ledger of Otávio, the previous curator, which was left in the vault. Chin up!\n\n' +
    'We reopen tomorrow at 9. Good luck!',
  'notebook.welcome.signature': '— Helena, director',
  'notebook.welcome.postscript':
    'P.S. The previous curator left his things here. He locked everything with dates from volleyball history.',
  'notebook.todo.heading': 'Before 9 a.m.',
  'notebook.todo.power': 'Restore the power: office, atrium and Wing 1',
  'notebook.todo.catalogue': 'Catalogue the collection: check it piece by piece',
  // The vault under the hall. The iron safe in the office is "the iron
  // safe", always with its metal: a bare "safe" would be either (D34).
  'notebook.todo.vault': 'The vault — only Otávio knew how to open it',
  'notebook.todo.vault.note': 'not tonight: the basement flooded',
  'notebook.todo.drawer': "Otávio's drawer: “the year the game stopped being called Mintonette”.",
  'notebook.todo.safe-key': 'Key to the iron safe.',
  'notebook.todo.posse': 'Sign the deed of office, at the lectern.',
  'notebook.todo.proof':
    'The refit took off the plaques the line that says what each thing is. Otávio kept the proof in the iron safe.',
  'notebook.todo.proof.note': 'not tonight: it waits for the reopening',
  'notebook.counter': '{done} of {total}',
  'device.office-radio.title': "Porter's radio",
  'device.office-clock.title': 'Office clock',
  'clock.set': 'Clock set',
  'device.office-telephone.title': 'Telephone',
  'device.office-telephone.prompt': 'Dial',
  'device.office-telephone.dead': 'The line is dead.',
  'device.office-answering-machine.title': 'Answering machine',
  'device.office-answering-machine.speaker': 'Otávio · recorded message',
  'document.otavio-tape.title': "Otávio's message (answering machine)",
  'document.otavio-tape.summary': 'The message Otávio recorded before his bus, cut off when the power went.',
  'tape.otavio.1': 'This is Otávio, the curator. The former one, as of this afternoon.',
  'tape.otavio.2':
    'I am recording on the machine on your desk because the handover was set for six and the road closes when it rains.',
  'tape.otavio.3': "The last bus is the five o'clock.",
  'tape.otavio.4': 'The handover of the collection is written down, in the top drawer of the tall cabinet.',
  'tape.otavio.5':
    'The drawer opens with a year: the year the game stopped being called Mintonette. I will not say which.',
  'tape.otavio.6':
    'It is in Wing 1, on a portrait. Whoever reads what is written on the pieces is exactly who I want opening it.',
  'tape.otavio.7': 'The hat on the coat stand stays: it is not mine, it belongs to the post.',
  'tape.otavio.8':
    'And one thing about the plinth in the hall, which matters, because with this rain the basement —',
  'tape.otavio.9': '[The recording ends here. The display reads 16:47.]',
  'night.hour.1': 'Gone seven',
  'night.hour.2': 'Nearly eight',
  'night.hour.3': 'Gone eight',
  'night.hour.4': 'Nearly nine',
  'night.hour.5': 'Gone nine',
  'night.hour.6': 'Nearly ten',
  'night.hour.7': 'Gone ten',
  'night.hour.8': 'Nearly eleven',
  'night.hour.9': 'Gone eleven',
  'night.hour.10': 'Nearly midnight',
  'device.atrium-podium.title': "The Founder's plinth",
  'device.atrium-podium.notice': 'Closed off: the floor is being relaid.',
  'device.atrium-lectern.title': 'Lectern',
  'device.atrium-lectern.empty': 'signing desk: the Book of Deeds is missing',
  'radio.speaker.porter': 'Jorge · porter',
  // His introduction, owed to every save. "Again": he let the curator in at
  // the start of the night. He calls his post the front desk, and the room
  // the signs call the atrium, the hall.
  'radio.call.hello.1': "Curator? It's Jorge again, at the front desk. Over.",
  'radio.call.hello.2':
    'The panel here says the office lights are back. The storm tripped every breaker in the building.',
  'radio.call.hello.3': 'Otávio retired today. He caught the bus before the road closed and left it all to you.',
  'radio.call.hello.4':
    "I've got the alarm panel here: every case, drawer and door in this building lights a little lamp for me.",
  'radio.call.hello.5':
    'The clock there stopped with the power: set it. Basement flooded; nobody goes down tonight. Call me on the radio. Over and out.',
  'radio.call.first.1':
    'The hall breaker is across from you, a little to your right as you leave, by the Wing 1 entrance. Look for the little red light.',
  'radio.call.first.2': 'The hall, the atrium: same place. The sign says atrium; I say the hall. Over.',
  'radio.call.notebook.1':
    'Oh, and Helena, the director, left you a notebook there on the desk. Take it before you go — it explains everything. Over.',
  'radio.call.atrium.1':
    "The hall's on my panel! Wing 1 is the door with the sign, by the breaker. Its own breaker is on the wall facing its doors. Over.",
  'radio.call.holyoke.1': 'Wing 1 is lit. Now it gets checked, piece by piece. Over.',
  'radio.call.catalogued.1':
    'A case just opened and shut on my panel. First one checked? That leaves… well, plenty. Over.',
  'radio.call.shortcut.1':
    "The service door opened from the inside. It stays unlocked both ways now. It's on my panel. Over.",
  'radio.call.machine.1':
    "There's a message light blinking on the office extension. Must be Otávio's doing. Over.",
  'radio.call.drawer.1':
    "Otávio's drawer just opened on my panel. Thirty years and I never saw what was in it. What was in it?",
  'radio.call.drawer.2':
    "If it's a key, it's for the iron safe. That was him: a key inside a drawer, a drawer inside a date. Over.",
  'radio.call.legacy-drawer.1':
    "Have another look in Otávio's drawer: there was a key pinned to the note. Over.",
  // The one line that sets the two safes side by side: the only place a
  // bare "the safe" is said.
  'radio.call.safe.1':
    "The iron safe's open. That one is the safe. The vault is the Founder's, down below: don't mix them up.",
  'radio.call.safe.2':
    "If there's a book in there, it's the Book of Deeds. A deed gets signed at the lectern in the hall, with the house lit. Over.",
  'sequence.speaker.porter': 'Jorge · loudspeaker',
  'sequence.posse.card': 'Deed of office signed',
  'sequence.posse.1':
    "The lectern lamp came on and went out: you signed. The collection's yours, curator. {hora}.",
  'sequence.posse.2':
    'The ledger the insurer wants is in the vault, and the basement flooded. Nobody goes down tonight. Over.',
  // One height to a call: where, what, how.
  'radio.hint.notebook.where': 'Notebook first: the director, Helena, left one on the desk.',
  'radio.hint.notebook.what': 'Red cover, next to the lamp.',
  'radio.hint.notebook.how': 'Pick it up and read it to the last page.',
  'radio.hint.atrium.where': "The breaker's on the far side of the hall.",
  'radio.hint.atrium.what': 'A little red light, by the door with the sign.',
  'radio.hint.atrium.how': 'A grey box on the wall, with a lever. Just throw it.',
  'radio.hint.holyoke.where': 'Wing 1 has its own breaker, on the wall facing the doors.',
  'radio.hint.holyoke.what': 'A little red light, across the room.',
  'radio.hint.holyoke.how': 'Cross in the dark to the little red light. The torch will do.',
  'radio.hint.drawer.where':
    "Otávio's drawer opens with a year. He left a message on the office answering machine.",
  'radio.hint.drawer.what': "The year is in Wing 1, on Morgan's portrait.",
  'radio.hint.drawer.how':
    "Pick the frame up and tilt it: it's on the bottom edge. Or in the provenance archive, by the wing entrance.",
  'radio.hint.key.where': "Otávio's key? It's for the iron safe.",
  'radio.hint.key.what': 'In the corner of the office, beside the bookcases.',
  'radio.hint.key.how': 'Walk up and open it. The key stays in it.',
  'radio.hint.posse.where': 'A deed gets signed at the lectern in the hall.',
  'radio.hint.posse.what': 'The lectern with its lamp lit, between the two doors on the Wing 1 wall.',
  'radio.hint.posse.how': 'With all three rooms lit, hold the action down until the pen stops.',
  // The honest close: only heard with the deed signed.
  'radio.hint.rest':
    "The post is yours, signed. Now it's checking the collection, piece by piece. The vault can wait: the basement flooded.",

  'radio.speaker.static': 'Radio',
  'radio.call.taken.1':
    'Got the radio? Good, keep it on you. From the front desk I can reach the whole building.',
  'radio.call.taken.2':
    'Just press the side button and call me. Just not every five minutes, eh? Over.',
  'radio.hint.notebook.curt': 'Notebook. On the desk. Pick it up and read it. Over.',
  'radio.hint.atrium.curt': 'The hall. Beside the Wing 1 door. Little red light. Over.',
  'radio.hint.holyoke.curt': 'Wing 1. Breaker on the far wall. Little red light. Go.',
  'radio.hint.drawer.curt':
    "Otávio's drawer: a date. Morgan's portrait, Wing 1. Pick the frame up and tilt it: it's on the bottom edge.",
  'radio.hint.key.curt': 'Iron safe. Corner of the office. The key opens it. Over.',
  'radio.hint.posse.curt': 'Lectern. The hall. Sign. Over.',
  'radio.hint.rest.curt': "Signed. Checking is what's left. The vault: not tonight.",
  'radio.patience.t1.ready': 'Front desk, go ahead.',
  'radio.patience.t1.listening': "Go on, curator. I'm listening.",
  'radio.patience.t1.jorge': 'Jorge here. Over.',
  'radio.patience.t2.again': 'Again, curator? All right, all right.',
  'radio.patience.t2.coffee': "Go ahead. My coffee's gone cold anyway.",
  'radio.patience.t2.reception':
    "For the record, I'm the night porter, not customer service. Go on.",
  'radio.patience.t2.repeat': "I'll say it again. Repeating's free:",
  'radio.patience.t2.chat': "I'm starting to think you just like talking to me.",
  'radio.patience.t3.hotline': 'Curator, this is the front desk, not a helpline.',
  'radio.patience.t3.hotline.close': "Write it in the notebook. That's what it's for.",
  'radio.patience.t3.otavio':
    'Otávio worked here thirty years and called me twice. Once was a wrong number.',
  'radio.patience.t3.torch': 'Want me to come over and hold the torch for you too?',
  'radio.patience.t3.torch.close': 'Kidding. The roller door has no motor, and a post is a post.',
  'radio.patience.t3.crossword':
    "I'd nearly finished the crossword. Just missing “pest”, five letters. Go on.",
  'radio.patience.t3.announcer':
    "I know it by heart now. I'll do my radio-announcer voice, it sounds nicer:",
  'radio.patience.t4.please': "Curator… for heaven's sake.",
  'radio.patience.t4.meter': "If this radio had a meter running, you'd owe me the building by now.",
  'radio.patience.t4.slow': "I'll say it nice and slow. Must be the static:",
  'radio.patience.t4.dark': "Scared of the dark, is that it? You can tell me. I won't tell a soul.",
  'radio.patience.t4.dark.close': '…Except Helena, the director, maybe.',
  'radio.patience.t4.static.1': "Kssshh… curator… kssh… you're breaking up…",
  'radio.patience.t4.static.2': "…kssh… battery's going… kssshh… over and out.",
  'radio.patience.t4.penalty.1': "Hang on, there's a penalty on the transistor radio.",
  'radio.patience.t4.penalty.2': '…MISSED! See? You jinxed it. Over and out.',
  'radio.patience.t4.rounds.1': "Not now, curator, I'm doing my rounds.",
  'radio.patience.t4.rounds.2': "…All right, I'm sitting down. They're mental rounds. Call me in a bit.",
  'radio.patience.t5.age': "Curator, I'm sixty-two and I've never been called this much in my life.",
  'radio.patience.t5.last': "Fine. Last time. I swear it's the last time. It's always the last time.",
  'radio.patience.t5.collection':
    "I'm putting this radio in the collection: “the most used object in museum history”.",
  'radio.patience.t5.labels':
    "Know what Otávio did when he wasn't sure? He read the labels. READ. THE. LABELS.",
  'radio.patience.t5.babysitter': 'I should be getting a night-shift bonus for babysitting.',
  'radio.patience.t5.no.1': 'No.',
  'radio.patience.t5.no.2': 'Over and out. And this time I mean it.',
  'radio.patience.t5.recording.1':
    "You've reached the Volleyball Museum front desk. Our hours are nine to six.",
  'radio.patience.t5.recording.2':
    'If this is the curator, please hang up and read the labels. Beeep.',
  'radio.patience.t5.soap.1': "Curator, I'm switching off to watch my soap.",
  'radio.patience.t5.soap.2':
    "…Which I can't, because the power's out. All I've got left is you. Over and out.",
  'radio.patience.t5.song.1': "(singing softly) Oh curator, dear curator, won't you let me be…",
  'radio.patience.t5.song.2': "Like it? It's brand new. Now let me rest my voice.",
  'radio.patience.praise.went': 'Well, look at that — you got somewhere. Nice.',
  'radio.patience.praise.knack': "Now we're talking, curator. You're getting the hang of it.",
  'radio.patience.praise.needless': "See? You didn't need me that much. But since you called:",
  'radio.deadAir.noAnswer': '(Static. No answer from the front desk.)',
  'radio.deadAir.reallyOff': '(Just static. Jorge really did hang up.)',
  'radio.deadAir.rain': '(Nothing. Only the rain.)',

  // ---------------------------------------------------------------------
  // Wall lettering
  // ---------------------------------------------------------------------
  'sign.atrium.eyebrow': 'THE GAME SINCE 1895 · MEMORY IN MOTION',
  // The name the title screen, the flyleaf and the porter's recording use.
  'sign.atrium.heading': 'VOLLEYBALL MUSEUM',
  'sign.atrium.body':
    'A game invented in 1895 for people who found basketball too rough.\n' +
    'Reopening tomorrow. You are the one who finishes the install.',

  // ---------------------------------------------------------------------
  // Wing 1 — Holyoke
  // ---------------------------------------------------------------------
  // Atrium — the ball through time.
  'exhibit.atrium-ball-laced.title': 'Leather, seams and lacing',
  'exhibit.atrium-ball-laced.label':
    'Before the recessed valve, the cover had to open to reach the bladder. This reconstruction combines the form shown in period catalogues with a surviving ball: leather, raised seams and crossed lacing.',
  'exhibit.atrium-ball-laced.catalogue':
    'Laced volleyball, c. 1900–1925. A typological reconstruction, not a replica of the original 1895 ball. Twelve broad sections form a slightly soft sphere; olive-brown leather darkens along the seams, while an elongated opening is closed with rawhide lace.',
  'hotspot.atrium-ball-laced.lacing.label':
    'Oval opening with crossed lacing, before the modern recessed valve',
  'hotspot.atrium-ball-laced.seam.label':
    'Slightly raised outseam, vulnerable to wear and deformation',

  'exhibit.atrium-ball-tokyo-1964.title': 'The ball enters the Games',
  'exhibit.atrium-ball-tokyo-1964.label':
    'Tokyo 1964 hosted the first Olympic volleyball tournament. Surviving official balls show eighteen panels in six groups of three, ivory-white leather and narrow channels between the panels. The collection record does not identify a maker for this reconstruction.',
  'exhibit.atrium-ball-tokyo-1964.catalogue':
    'Official Tokyo 1964 ball, reconstructed without markings. The unused example held by the Japan Sport Council is ivory, with fine grain, yellowed channels and small ochre stains. The used ball is darkened, creased and deformed — evidence behind this model’s restrained wear.',
  'hotspot.atrium-ball-tokyo-1964.panels.label':
    'Eighteen near-rectangular panels arranged in six groups of three',
  'hotspot.atrium-ball-tokyo-1964.seam.label':
    'Narrow recessed channel between the panels',

  'exhibit.atrium-ball-colour-1998.title': 'The game gains colour',
  'exhibit.atrium-ball-colour-1998.label':
    'At the 1998 World Championship, the official ball adopted white, yellow and blue for clearer reading on court and on television. The MVL200 retained the classic construction: eighteen panels, now arranged as broad contrasting bands.',
  'exhibit.atrium-ball-colour-1998.catalogue':
    'Mikasa MVL200, the design adopted for the 1998 World Championship. Reconstructed without logos. Its six trios alternate white–yellow–white and blue–yellow–blue; the cover has fine grain, a satin sheen and recessed channels, without the dimples of the next generation.',
  'hotspot.atrium-ball-colour-1998.sequence.label':
    'White–yellow–white and blue–yellow–blue panel sequences',
  'hotspot.atrium-ball-colour-1998.seam.label':
    'Narrow recessed channel between the coloured panels',

  'exhibit.atrium-ball-eight-panel-2008.title': 'Eight panels, a dimpled surface',
  'exhibit.atrium-ball-eight-panel-2008.label':
    'Introduced in 2008, the MVA200 replaced eighteen panels with eight curved petals. Violet-blue and yellow form a spiral; shallow dimples and microtexture cover the entire surface. The change affected both its visual read and its contact with the air.',
  'exhibit.atrium-ball-eight-panel-2008.catalogue':
    'Mikasa MVA200, 2008. Reconstructed without Olympic, FIVB or manufacturer marks. Eight curved panels joined without visible topstitching form small rosettes where they meet. The microfibre and polyurethane cover combines regular depressions with a finer texture between them.',
  'hotspot.atrium-ball-eight-panel-2008.panels.label':
    'Eight petal-shaped panels assembled into a helical pattern',
  'hotspot.atrium-ball-eight-panel-2008.dimples.label':
    'Shallow dimples over a second layer of fine microtexture',

  'exhibit.ball-improvised.title': 'The ball that did not exist',
  'exhibit.ball-improvised.label':
    'Morgan first tried the bladder of a basketball: too light and too slow. Then the whole ball: too big and too heavy. Without a proper ball, the newly invented game did not work. The answer came from a commission.',
  'exhibit.ball-improvised.catalogue':
    "Basketball rubber bladder, c. 1895. Reproduction. In Morgan's words, too light and too slow; the whole basketball, too big and too heavy. That inadequacy is what led to the Spalding commission.",

  'exhibit.ball-spalding.title': 'The laced Spalding ball',
  'exhibit.ball-spalding.label':
    'A.G. Spalding & Bros. had a factory in Chicopee, near Holyoke. Morgan asked it for a purpose-built ball: a rubber bladder in a leather cover, 25 to 27 inches in circumference. This one is a reconstruction.',
  'exhibit.ball-spalding.catalogue':
    'Spalding volleyball, tanned leather with raised waxed-thread outseams and a lace closure. The lace is what places the object in time: the laced ball went out of use gradually between the 1920s and the 1940s.',
  'hotspot.ball-spalding.lacing.label': 'Rawhide lace over the inflation opening',
  'hotspot.ball-spalding.maker.label': "Maker's mark embossed on the opposite panel",
  'hotspot.ball-spalding.seam.label': 'Raised outseam, stitched by hand',

  'exhibit.net-1897.title': 'The net at 1.98 metres',
  'exhibit.net-1897.label':
    'The first net stood 6 feet 6 inches high, just above the head of an average man. By the 1897 handbook it was at least 2 feet wide and 27 feet long, on a court of 25 by 50 feet.',
  'exhibit.net-1897.catalogue':
    'Cotton cord net with canvas edge tape and wooden posts seated in cast-iron floor sockets. The low height is not an accident: the game was designed to be easy, for middle-aged men who found basketball too strenuous.',
  'hotspot.net-1897.tape.label': 'Canvas tape stitched along the top edge',
  'hotspot.net-1897.socket.label': 'Cast-iron socket set into the floor',

  'exhibit.handbook-1897.title': 'The first official handbook',
  'exhibit.handbook-1897.label':
    'The 1897 Official Handbook of the YMCA Athletic League is the first official handbook: a 25 by 50 foot court, a net at 6 feet 6 inches and a ball of 25 to 27 inches. A game ran nine innings.',
  'exhibit.handbook-1897.catalogue':
    'Official Handbook of the Athletic League of the Y.M.C.A. of North America, 1897. Facsimile. The original ten rules had appeared a year earlier, in July, in Physical Education magazine. The name was written as two words — volley ball — until 1952, when the American association adopted the one-word form.',
  'hotspot.handbook-1897.innings.label': 'The nine-innings clause, inherited from baseball',
  'hotspot.handbook-1897.ball-spec.label': 'Ball specification: 25 to 27 inches, 9 to 12 ounces',

  'exhibit.guide-1916.title': 'Morgan tells the story',
  'exhibit.guide-1916.label':
    'Dr. Frank Woods and fire chief John Lynch, both of Holyoke, helped Morgan draw up the first rules of the game. This Spalding volleyball guide, the 1916–17 edition, came out two decades after the invention.',
  'exhibit.guide-1916.catalogue':
    'Spalding Athletic Library — Volley Ball Guide, 1916–17 edition. It is here that Morgan credited Dr. Frank Woods and fire chief John Lynch for their contributions to the first rules. From the same decade comes the attack that became known as the Filipino bomb: a high pass, then a downward strike.',
  'hotspot.guide-1916.credit.label': 'Morgan credits Frank Woods and John Lynch',
  'hotspot.guide-1916.census.label':
    'An estimate from 1916: roughly 200,000 players in the United States',

  'exhibit.gym-suit.title': 'The catalogue gymnasium suit',
  'exhibit.gym-suit.label':
    'Ribbed wool jersey and knee-length trousers: a catalogue gymnasium suit, made by the museum. The museum has found no photograph of the members of 1895 and does not know what they wore.',
  'exhibit.gym-suit.catalogue':
    "A gymnasium suit like those in period sporting-goods catalogues. Reproduction. Morgan explained the game by his members' age and stamina, not by their clothes: it was recreation for middle-aged men who found basketball too strenuous.",

  'exhibit.portrait-morgan.title': 'William G. Morgan',
  'exhibit.portrait-morgan.label':
    'Physical director of the Holyoke YMCA. In 1895, aged 25, he devised a non-contact game for older, sedentary members. He called it Mintonette. He had met James Naismith, the inventor of basketball, in the early 1890s.',
  'exhibit.portrait-morgan.catalogue':
    'William George Morgan (Lockport, New York, 23 January 1870 — December 1942). He graduated from the International YMCA Training School in 1894 and took up the Holyoke post on 30 August 1895. The following year, in Springfield, he agreed to rename Mintonette Volley Ball; whether on a visit or at the YMCA conference demonstration, the sources disagree. He left the YMCA in 1897 for industry.',
  'hotspot.portrait-morgan.date.label':
    'Frame plaque: in 1896, in Springfield, Mintonette was renamed Volley Ball',

  'exhibit.photo-gym.title': 'The gymnasium where it happened',
  'exhibit.photo-gym.label':
    'The Holyoke YMCA gymnasium, in a photograph published in 1897: rings, a vaulting horse, pulley weights and, overhead, the suspended running track. This is the space the first match was played in.',
  'exhibit.photo-gym.catalogue':
    'Interior of the old Holyoke YMCA building. Reproduction of a photograph published in 1897 in the Transcript Industrial Edition. The building, from the early 1890s, burned down in 1943. From here came the two five-man teams Morgan took to Springfield to demonstrate the game.',

  // ---------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------
  'document.invention-date.title': 'Provenance note: the disputed date',
  'document.invention-date.body':
    'The date of 9 February 1895, repeated almost everywhere, does not survive the archive. The International Volleyball Hall of Fame found no verifiable citation for it and established that Morgan\'s posting in Auburn, Maine only ended in August 1895, and that he took up Holyoke on 30 August. By the Hall of Fame\'s reckoning, the invention probably falls in December 1895. The plaques in this wing therefore say only 1895.',

  'document.halstead.title': 'Springfield, 1896',
  'document.halstead.body':
    "Morgan demonstrated the game in the east gymnasium of the International YMCA Training School, at the YMCA physical directors' conference, at the invitation of Luther Halsey Gulick. He brought two five-man teams from Holyoke, captained by mayor James J. Curran and fire chief John Lynch. It was Professor Alfred T. Halstead who proposed replacing Mintonette with Volley Ball, and Morgan agreed. The sources disagree on the occasion: the Hall of Fame speaks of a visit early in the year and dates the conference to 7 July; the international federation places the suggestion after the demonstration.",

  'document.rule-changes.title': 'The changes that made the modern game',
  'document.rule-changes.body':
    'In 1917 a game was shortened from twenty-one points to fifteen. In 1918 the number of players was fixed at six per side. In 1920 came two rules: a maximum of three contacts per team, and a restriction on attacking from the back row. On the three contacts the sources disagree: the international federation says 1922.',

  // ---------------------------------------------------------------------
  // Facts
  // ---------------------------------------------------------------------
  'fact.springfield-renaming.claim': 'The year Mintonette was renamed Volley Ball',
  'fact.first-rulebook.claim': 'The year of the first official handbook',
  'fact.filipino-spike.claim': 'The year the spike emerged in the Philippines',
  'fact.six-a-side.claim': 'The year the side was fixed at six players',

  // ---------------------------------------------------------------------
  // Locks
  // ---------------------------------------------------------------------
  'lock.office-drawer.mapLabel': 'Combination drawer — 4 digits',
  'lock.office-drawer.prompt': 'locked (a year)',
  'lock.office-safe.mapLabel': 'Iron safe — needs a key',
  'lock.office-safe.prompt': 'needs a key',
  'lock.hint.highlight': 'The right plaque has lit up.',
  'lock.hint.audio': 'The docent recording repeats the year.',
  'lock.hint.reveal': 'The dial has caught on the correct digit.',
} as const satisfies Record<TranslationKey, string>
