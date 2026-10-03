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
  'radio.taken': 'You took the radio',
  'radio.taken.keyboard': 'R calls the porter, from any room.',
  'radio.taken.touch': 'The radio icon calls the porter, from any room.',
  'ui.radio.hungUp': 'Jorge hung up. Try again in a moment.',

  'prompt.examine': 'Examine',
  'prompt.read': 'Read',
  'prompt.open': 'Open',
  'prompt.rotate': 'Drag to rotate',
  'prompt.locked': 'Locked',
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
  'power.restored': 'Power restored',
  'radio.skip': 'Skip',
  'notebook.next': 'Turn the page',
  'notebook.previous': 'Back',

  'map.title': 'Museum plan',
  'map.state.unlit': 'No power',
  'map.state.partial': 'Objects still uncatalogued',
  'map.state.complete': 'Catalogued',
  'map.legend': 'Legend',

  'catalogue.title': 'Catalogue',
  'catalogue.empty': 'Nothing catalogued yet. Examine an object and turn it over in your hands.',
  'catalogue.incomplete': 'Seen, but not catalogued. Turn it over.',
  'journal.title': "Curator's notebook",
  'archive.title': 'Archive',
  'archive.empty': 'No documents found yet. Look in drawers and filing cabinets.',
  'archive.filed': 'Filed in your notebook — Tab to re-read',
  'archive.filed.touch': 'Filed in your notebook — tap the notebook icon to re-read',
  'archive.filed.noJournal': "It will be filed in the curator's notebook, still on the office desk.",
  'container.office.title': "Curator's locked drawer",
  'document.predecessor.title': 'Note from the previous curator',
  'document.predecessor.body':
    'If you are reading this you found the combination, which means you read the labels instead of walking past them. Good. The rest of the collection is in the vault beneath the atrium, and it does not open with numbers: it opens with three medals. One for each era you catalogue in full. Take your time. The museum reopens tomorrow, but it has been here a hundred and thirty years.',
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
  'prompt.journal': 'Notebook',
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
    'We reopen tomorrow at 9. Good luck!',
  'notebook.welcome.signature': '— Helena, director',
  'notebook.welcome.postscript':
    'P.S. The previous curator left his things here. He locked everything with dates from volleyball history.',
  'notebook.todo.heading': 'Before 9 a.m.',
  'notebook.todo.power': 'Restore the power: office, atrium and wings',
  'notebook.todo.catalogue': 'Catalogue the collection',
  'notebook.todo.vault': 'The vault — only Otávio knew how to open it',
  'device.office-radio.title': "Porter's radio",
  'radio.speaker.porter': 'Jorge · porter',
  'radio.call.first.1': "Curator? It's Jorge, at the front desk. Over.",
  'radio.call.first.2':
    'The panel here says the office lights are back. The storm tripped every breaker in the building.',
  'radio.call.first.3':
    "The atrium breaker is on the west wall, beside the Wing 1 entrance. Look for the little red light.",
  'radio.call.first.4':
    "And don't go down to the basement: it flooded. Anything at all, take the radio off the desk and call me. Over and out.",
  'radio.call.notebook.1':
    'Oh, and Helena, the director, left you a notebook there on the desk. Take it before you go — it explains everything. Over.',
  'radio.hint.notebook':
    'Notebook first, curator: Helena, the director, left you one on the office desk. It explains everything.',
  'radio.hint.atrium':
    'The atrium breaker is on the west wall, near the Wing 1 entrance. The little red light shows you where.',
  'radio.hint.holyoke':
    "Wing 1 has its own breaker panel, inside. Cross it in the dark if you have to — the torch will do.",
  'radio.hint.drawer':
    "That locked drawer in your office? Otávio used dates you can find on the labels. Have a look at Morgan's portrait in Wing 1.",
  'radio.hint.vault':
    "It's all yours now, curator. Otávio was always going on about three medals and a vault under the atrium. Over.",

  'radio.speaker.static': 'Radio',
  'radio.call.taken.1':
    'Got the radio? Good, keep it on you. From the front desk I can reach the whole building.',
  'radio.call.taken.2':
    'Just press the side button and call me. Just not every five minutes, eh? Over.',
  'radio.hint.notebook.curt': 'Notebook. On the desk. Pick it up and read it. Over.',
  'radio.hint.atrium.curt': 'Atrium. West wall. Little red light. Over.',
  'radio.hint.holyoke.curt': "Wing 1. Panel's inside. Torch in hand. Go.",
  'radio.hint.drawer.curt': "Otávio's drawer: a date. The date's on the Wing 1 labels. Read them.",
  'radio.hint.vault.curt': 'Three medals. One vault. Under the atrium. The rest is up to you.',
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
  'radio.patience.t3.crossword':
    "I'd nearly finished the crossword. Just missing “pest”, four letters. Go on.",
  'radio.patience.t3.announcer':
    "I know it by heart now. I'll do my radio-announcer voice, it sounds nicer:",
  'radio.patience.t4.please': "Curator… for heaven's sake.",
  'radio.patience.t4.meter': "If this radio had a meter running, you'd owe me the building by now.",
  'radio.patience.t4.slow': "I'll say it nice and slow. Must be the static:",
  'radio.patience.t4.dark': "Scared of the dark, is that it? You can tell me. I won't tell a soul.",
  'radio.patience.t4.dark.close': '…Except Helena, maybe.',
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
  'radio.deadAir.rain': '(Nothing. Only the rain against the windows.)',

  // ---------------------------------------------------------------------
  // Wall lettering
  // ---------------------------------------------------------------------
  'sign.atrium.eyebrow': 'SINCE 1895 · MEMORY IN MOTION',
  'sign.atrium.heading': 'MUSEUM OF VOLLEYBALL',
  'sign.atrium.body':
    'A game invented in 1895 for people who found basketball too rough.\n' +
    'Reopening tomorrow. You are the one who finishes the install.',

  // ---------------------------------------------------------------------
  // Wing 1 — Holyoke
  // ---------------------------------------------------------------------
  // Atrium — the ball through time.
  'exhibit.atrium-ball-laced.title': 'Leather, seams and lacing',
  'exhibit.atrium-ball-laced.label':
    'Before the recessed valve, the cover had to open to reach the bladder. This reconstruction combines the form shown in 1918–1920 catalogues with a surviving ball from about 1925: leather, raised seams and crossed lacing.',
  'exhibit.atrium-ball-laced.catalogue':
    'Laced volleyball, c. 1900–1925. A typological reconstruction, not a replica of the original 1895 ball. Twelve broad sections form a slightly soft sphere; olive-brown leather darkens along the seams, while an elongated opening is closed with rawhide lace.',
  'hotspot.atrium-ball-laced.lacing.label':
    'Oval opening with crossed lacing, before the modern recessed valve',
  'hotspot.atrium-ball-laced.seam.label':
    'Slightly raised outseam, vulnerable to wear and deformation',

  'exhibit.atrium-ball-tokyo-1964.title': 'The ball enters the Games',
  'exhibit.atrium-ball-tokyo-1964.label':
    'Tokyo 1964 hosted the first Olympic volleyball tournament. Surviving official balls show eighteen panels in six groups of three, ivory-white leather and narrow seam channels. The collection record does not identify a maker for this reconstruction.',
  'exhibit.atrium-ball-tokyo-1964.catalogue':
    'Official Tokyo 1964 ball, reconstructed without markings. The unused example held by the Japan Sport Council is ivory, with fine grain, yellowed seams and small ochre stains. The used ball is darkened, creased and deformed — evidence behind this model’s restrained wear.',
  'hotspot.atrium-ball-tokyo-1964.panels.label':
    'Eighteen near-rectangular panels arranged in six groups of three',
  'hotspot.atrium-ball-tokyo-1964.seam.label':
    'Narrow recessed seam channel with no exposed thread',

  'exhibit.atrium-ball-colour-1998.title': 'The game gains colour',
  'exhibit.atrium-ball-colour-1998.label':
    'At the 1998 World Championship, the official ball adopted white, yellow and blue for clearer reading on court and on television. The MVL200 retained the classic construction: eighteen hand-stitched panels, now arranged as broad contrasting bands.',
  'exhibit.atrium-ball-colour-1998.catalogue':
    'Mikasa MVL200, the design adopted for the 1998 World Championship. Reconstructed without logos. Its six trios alternate white–yellow–white and blue–yellow–blue; the cover has fine grain, a satin sheen and recessed seams, without the dimples of the next generation.',
  'hotspot.atrium-ball-colour-1998.sequence.label':
    'White–yellow–white and blue–yellow–blue panel sequences',
  'hotspot.atrium-ball-colour-1998.seam.label':
    'Hand-stitched panels; the thread remains hidden within the channel',

  'exhibit.atrium-ball-eight-panel-2008.title': 'Eight panels, thousands of dimples',
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
    'Morgan tried a basketball first: too heavy. Then the bare bladder with the leather stripped off: too light, it floated. Without a proper ball, the game he had just invented did not work. The answer came from a commission.',
  'exhibit.ball-improvised.catalogue':
    'Basketball rubber bladder, c. 1895. Reproduction. The first object in volleyball history is a failure: too soft to come down, too light to cross the net with intent. That inadequacy is what produced the Spalding commission.',

  'exhibit.ball-spalding.title': 'The laced Spalding ball',
  'exhibit.ball-spalding.label':
    'A.G. Spalding & Bros. had a factory in Chicopee Falls, a few miles from Holyoke. Morgan commissioned a purpose-built ball: a rubber bladder inside hand-stitched leather, closed with a rawhide lace. Roughly 25 inches in circumference.',
  'exhibit.ball-spalding.catalogue':
    'Spalding volleyball, tanned leather with raised waxed-thread outseams and a lace closure, c. 1900–1920. The lace is what dates the object: it survived into the 1930s and vanished once the laceless ball became the official standard.',
  'hotspot.ball-spalding.lacing.label': 'Rawhide lace over the inflation opening',
  'hotspot.ball-spalding.maker.label': "Maker's mark embossed on the opposite panel",
  'hotspot.ball-spalding.seam.label': 'Raised outseam, stitched by hand',

  'exhibit.net-1897.title': 'The net at 1.98 metres',
  'exhibit.net-1897.label':
    'The first net stood 6 feet 6 inches off the floor — about half a foot above the average man of the period. The court measured 25 by 50 feet. The 1897 rules required a net at least 2 feet wide and 27 feet long.',
  'exhibit.net-1897.catalogue':
    'Cotton cord net with canvas edge tape and wooden posts seated in cast-iron floor sockets. The low height is not an accident: the game was designed to be easy, for middle-aged men who found basketball too strenuous.',
  'hotspot.net-1897.tape.label': 'Canvas tape stitched along the top edge',
  'hotspot.net-1897.socket.label': 'Cast-iron socket set into the floor',

  'exhibit.handbook-1897.title': 'The first printed rulebook',
  'exhibit.handbook-1897.label':
    'The 1897 Official Handbook of the Athletic League of the YMCA of North America carries the first published specifications: a 25 by 50 foot court, a net at 6 feet 6 inches, and a ball of 25 to 27 inches circumference weighing 9 to 12 ounces. A game ran nine innings.',
  'exhibit.handbook-1897.catalogue':
    'Official Handbook of the Athletic League of the Y.M.C.A. of North America, 1897. Facsimile. The original ten rules had appeared a year earlier in the July 1896 issue of Physical Education magazine. The name stayed two words — volley ball — until 1952.',
  'hotspot.handbook-1897.innings.label': 'The nine-innings clause, inherited from baseball',
  'hotspot.handbook-1897.ball-spec.label': 'Ball specification: 25 to 27 inches, 9 to 12 ounces',

  'exhibit.guide-1916.title': 'The guide that recorded the bomba',
  'exhibit.guide-1916.label':
    'In the Philippines, around 1916, players invented the combination that changed everything: a high pass followed by a second player striking the ball downward. They called the kill the bomba and the hitter the bomberino. Americans called it the Filipino bomb.',
  'exhibit.guide-1916.catalogue':
    'Spalding Athletic Library — Volley Ball Guide, 1916–17 edition. It is here that Morgan formally credited Dr. Frank Wood and fire chief John Lynch for their contributions to the first rules. The Filipino attack forced the rule changes that followed.',
  'hotspot.guide-1916.credit.label': 'Morgan credits Frank Wood and John Lynch',
  'hotspot.guide-1916.census.label': 'The 1916 census: roughly 200,000 players in the United States',

  'exhibit.gym-suit.title': 'The gymnasium suit',
  'exhibit.gym-suit.label':
    'Ribbed worsted wool, knee-length trousers, canvas shoes with rubber soles. No synthetics, no white plastic: everything is a pigment, a dye or an oxide. Volleyball was born inside Victorian gymnasium dress, not inside sportswear.',
  'exhibit.gym-suit.catalogue':
    'YMCA gymnasium suit, c. 1895–1915. Reproduction. The wool knit was heavy and held sweat, which helps explain why the game was designed without contact and with a low net: it was recreation for a middle-aged body, not competition.',

  'exhibit.portrait-morgan.title': 'William G. Morgan',
  'exhibit.portrait-morgan.label':
    'Physical director of the YMCA in Holyoke, Massachusetts. In 1895, aged 25, he built a non-contact game for older, sedentary members. He called it Mintonette. He had met James Naismith, the inventor of basketball, in 1891.',
  'exhibit.portrait-morgan.catalogue':
    'William George Morgan (Lockport, New York, 23 January 1870 — 27 December 1942). He graduated from the International YMCA Training School in 1894 and took up the Holyoke post on 30 August 1895. In July 1896, demonstrating the game at a YMCA conference in Springfield, he agreed to rename Mintonette Volley Ball. He left the YMCA in 1900 for industry.',
  'hotspot.portrait-morgan.date.label':
    'Frame plaque: in 1896, at a demonstration in Springfield, Mintonette was renamed Volley Ball',

  'exhibit.photo-gym.title': 'The gymnasium where it happened',
  'exhibit.photo-gym.label':
    'The Holyoke YMCA gymnasium, photographed in 1897, at the corner of High and Appleton Streets. Wooden floor, riveted steel trusses, gymnastic apparatus stacked against the wall. This is the space the first match was played in.',
  'exhibit.photo-gym.catalogue':
    'Interior of the old Holyoke YMCA building, 1897. The building served from 1886 to 1943. On 7 July 1896 Morgan took two five-man teams from Holyoke to Springfield to demonstrate the game — that is where it got its lasting name.',

  // ---------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------
  'document.invention-date.title': 'Provenance note: the disputed date',
  'document.invention-date.body':
    'The date of 9 February 1895, repeated almost everywhere, does not survive the archive. The International Volleyball Hall of Fame found no verifiable citation for it and established that Morgan\'s posting in Auburn, Maine only ended in August 1895, and that he took up Holyoke on 30 August. The institution places the invention in December 1895. The plaques in this wing therefore say only 1895.',

  'document.halstead.title': 'Springfield, 7 July 1896',
  'document.halstead.body':
    'Morgan demonstrated the game in the east gymnasium of the International YMCA Training School, during the physical directors\' conference convened by Luther Halsey Gulick. He brought two five-man teams from Holyoke, captained by mayor James J. Curran and fire chief John Lynch. Professor Alfred T. Halstead, watching the volleying nature of the play, proposed replacing Mintonette with Volley Ball. Morgan agreed.',

  'document.rule-changes.title': 'The changes that made the modern game',
  'document.rule-changes.body':
    'In 1917 a game was shortened from 21 points to 15. In 1918 the number of players was fixed at six per side. In 1920 came the two rules that define volleyball to this day: a maximum of three contacts per team, and a restriction on attacking from the back row. All three answer the same problem — the attack invented in the Philippines had unbalanced the game.',

  // ---------------------------------------------------------------------
  // Facts
  // ---------------------------------------------------------------------
  'fact.springfield-renaming.claim': 'The year Mintonette was renamed Volley Ball',
  'fact.first-rulebook.claim': 'The year of the first printed official rulebook',
  'fact.filipino-spike.claim': 'The year the spike emerged in the Philippines',
  'fact.six-a-side.claim': 'The year the side was fixed at six players',

  // ---------------------------------------------------------------------
  // Locks
  // ---------------------------------------------------------------------
  'lock.office-drawer.mapLabel': 'Combination drawer — 4 digits',
  'lock.holyoke-power.mapLabel': 'Breaker panel — handle',
  'lock.hint.highlight': 'The right plaque has lit up.',
  'lock.hint.audio': 'The docent recording repeats the year.',
  'lock.hint.reveal': 'The dial has caught on the correct digit.',
} as const satisfies Record<TranslationKey, string>
