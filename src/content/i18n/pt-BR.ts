/**
 * pt-BR — the source of truth for every string in the museum.
 *
 * `en.ts` is typed against this object, so a missing English key is a compile
 * error rather than a blank plaque discovered by a player.
 *
 * Two constraints the copy has to respect:
 *   - Wall labels are budgeted at ~40 words. Eight per gallery, maximum. The
 *     surplus belongs in the archive layer, not on the wall.
 *   - Portuguese runs 15-25% longer than English. Plaques auto-fit, but text
 *     that needs three lines in pt-BR and two in en will look wrong in one of
 *     them — write to the Portuguese length and let English breathe.
 */

export const ptBR = {
  // ---------------------------------------------------------------------
  // Shell
  // ---------------------------------------------------------------------
  // The museum's own name, the same on the title, the flyleaf, the wall and
  // the porter's recording. «Vôlei» is the sport; the house is «do Voleibol».
  'ui.title': 'Museu do Voleibol',
  'ui.subtitle': 'A história do vôlei mundial, sala por sala.',
  'ui.enter': 'Entrar no museu',
  'ui.continue': 'Continuar',
  'ui.newGame': 'Novo jogo',
  'ui.newGame.confirm': 'Confirmar — apagar todo o progresso',
  'ui.lookHint': 'Clique para olhar',
  'ui.loading': 'Preparando a galeria…',
  'ui.settings': 'Ajustes',
  'ui.language': 'Idioma',
  'ui.brightness': 'Brilho',
  'ui.motion': 'Movimento de câmera',
  'ui.motion.headbob': 'Balanço ao andar',
  'ui.motion.fov': 'Ampliação de campo ao correr',
  'ui.quality': 'Qualidade gráfica',
  'ui.readingMode': 'Modo leitura',
  'ui.credits': 'Créditos e acervo',
  'mobile.controls': 'Controles de toque',
  'mobile.move': 'Direcional de movimento',
  'mobile.look': 'Direcional de câmera',
  'mobile.action': 'Ação',
  'mobile.landscape.title': 'Gire o dispositivo',
  'mobile.landscape.body':
    'O museu funciona na horizontal. Se necessário, saia da visualização dividida.',
  'mobile.landscape.activate': 'Ativar modo horizontal',
  'mobile.fullscreen.resume': 'Retomar em tela cheia',
  'mobile.fullscreen.install':
    'Neste navegador, use “Adicionar à Tela de Início” para ter tela cheia completa.',
  'mobile.fullscreen.dismiss': 'Entendi',
  'ui.torch': 'Lanterna',
  'ui.torch.on': 'Apagar a lanterna',
  'ui.torch.off': 'Acender a lanterna',
  'ui.journal.open': 'Abrir o caderno',
  'journal.taken': 'Você pegou o caderno',
  'journal.taken.keyboard': 'Tab abre a planta, o catálogo e o arquivo.',
  'journal.taken.touch': 'O ícone do caderno abre a planta, o catálogo e o arquivo.',
  // The notebook's own first tab: the director's list, alive.
  'journal.tab.notebook': 'Caderno',
  'radio.taken': 'Você pegou o rádio',
  'radio.taken.keyboard': 'R chama a portaria, de qualquer sala.',
  'radio.taken.touch': 'O ícone do rádio chama a portaria, de qualquer sala.',
  'ui.radio.hungUp': 'O Jorge desligou. Tente daqui a pouco.',

  // Prompts
  'prompt.examine': 'Examinar',
  'prompt.read': 'Ler',
  'prompt.rotate': 'Arraste para girar',
  'prompt.locked': 'Trancado',
  'prompt.close': 'Fechar',
  'prompt.power': 'Restaurar energia',
  'prompt.door.open': 'Abrir porta',
  'prompt.door.loading': 'Preparando a próxima sala…',
  'prompt.door.opening': 'Abrindo…',
  'prompt.door.otherSide': 'Abre pelo outro lado',
  'prompt.door.unpowered': 'Fechadura sem energia',
  'prompt.radio.call': 'Chamar a portaria',
  'prompt.radio.dead': 'Sem carga',
  'prompt.radio.take': 'Pegar o rádio',
  'prompt.clock.set': 'Acertar o relógio',
  // A thing that speaks when worked: what E does to it, by what it would do.
  // A device may have a word of its own for the first («Discar»).
  'prompt.voice.play': 'Ouvir',
  'prompt.voice.again': 'Ouvir de novo',
  'prompt.voice.dead': 'Sem energia',
  'power.restored': 'Energia restaurada',
  // Followed by the room the door opens into: «Atalho destrancado — Ala 1 · Holyoke».
  'door.released': 'Atalho destrancado',
  'radio.skip': 'Pular',
  'notebook.next': 'Virar a página',
  'notebook.previous': 'Voltar',
  // A cabinet is read one paper at a time: on to the next one.
  'reader.next': 'Próximo',
  // Followed by the name of what was taken: «Você pegou — Chave do cofre de ferro».
  'credential.taken': 'Você pegou',

  // Map
  'map.title': 'Planta do museu',
  'map.state.unlit': 'Sem energia',
  // True of a room with no piece in it too: the office is lit with a note
  // still in its drawer, and «Peças por catalogar» was false of it.
  'map.state.partial': 'Acesa, falta conferir',
  'map.state.complete': 'Completa',
  'map.legend': 'Legenda',
  'map.unknown': 'Sala ainda não visitada',
  'map.north': 'Norte',
  'map.you': 'Você está aqui',

  // Catalogue
  'catalogue.title': 'Catálogo',
  'catalogue.empty': 'Nada catalogado ainda. Examine uma peça e gire-a nas mãos.',
  'catalogue.incomplete': 'Peça vista, mas não catalogada. Vire-a.',
  'journal.title': 'Caderno do curador',
  'archive.title': 'Arquivo',
  'archive.empty': 'Nenhum documento encontrado. Procure gavetas e arquivos.',
  'archive.filed': 'Arquivado no caderno — Tab para reler',
  'archive.filed.touch': 'Arquivado no caderno — toque no ícone do caderno para reler',
  'archive.filed.noJournal':
    'Será arquivado no caderno do curador, que continua na mesa do escritório.',
  // The name says whose it is, never that it is locked: that is the lock's
  // to say while it is shut (`lock.office-drawer.prompt`), and stops being
  // true the moment it opens.
  'container.office.title': 'Gaveta do Otávio',
  'document.predecessor.title': 'Bilhete do curador anterior',
  'document.predecessor.body':
    'Se você está lendo isto, achou a combinação — o que significa que leu as placas em vez de passar por elas. Bom. O resto do acervo está no cofre, sob o átrio, e não abre com números: abre com três medalhas. Uma de cada era que você catalogar por inteiro. Não tenha pressa. O museu reabre amanhã, mas ele existe há cento e trinta anos.',
  'lock.title': 'Fechadura de combinação',
  'lock.prompt': 'Quatro dígitos',
  'lock.submit': 'Abrir',
  'lock.wrong': 'Não abre.',
  'lock.opened': 'A gaveta cede.',
  'lock.hint.source': 'Você viu isto em algum lugar da Ala 1.',
  'credits.note':
    'As imagens deste museu são de domínio público ou licenciadas em Creative Commons. Cada uma é creditada aqui e sob a própria obra na galeria.',
  'credits.source': 'Fonte',
  'credits.licence': 'Licença',
  'container.holyoke-a.title': 'Arquivo — proveniência',
  'container.holyoke-b.title': 'Arquivo — regulamentos',

  // The narrative alibi for everything: the dark, the torch, the drawers,
  // the catalogue, the office, the vault, the ending.
  // Two safes, two names (D34): the «cofre de ferro» stands in the office,
  // the «caixa-forte» is the Founder's vault under the hall. A bare «cofre»
  // would be either (`test:opening-flow` holds every text to that).
  'intro.line1': 'Você é o novo curador.',
  'intro.line2': 'É a noite anterior à reabertura. A energia caiu.',
  'intro.line3': 'Seu antecessor deixou alguma coisa na caixa-forte.',

  // ---------------------------------------------------------------------
  // Rooms
  // ---------------------------------------------------------------------
  'room.atrium.title': 'Átrio',
  'room.atrium.nickname': 'o saguão do plinto',
  'room.atrium.sign.eyebrow': 'ORIENTAÇÃO',
  'room.atrium.sign.title': 'ÁTRIO CENTRAL',
  'room.holyoke.title': 'Ala 1 · Holyoke',
  'room.holyoke.subtitle': '1895 – 1929',
  'room.holyoke.nickname': 'a sala da bola de cadarço',
  'room.holyoke.sign.eyebrow': 'ALA 01 · ORIGENS',
  'room.holyoke.sign.title': 'HOLYOKE',
  'room.office.title': 'Escritório do curador',
  'room.office.nickname': 'a sala da luminária verde',
  'room.office.sign.eyebrow': 'ACERVO · PESQUISA',
  'room.office.sign.title': 'ESCRITÓRIO DO CURADOR',
  'power.atrium.title': 'Quadro geral do átrio',
  'power.holyoke.title': 'Quadro de força da Ala 1',
  'power.office.title': 'Luminária do curador',

  // ---------------------------------------------------------------------
  // The opening: the curator's office at night
  // ---------------------------------------------------------------------
  'container.office-notebook.title': 'Caderno do curador',
  'document.welcome.title': 'Boas-vindas da diretora',
  'document.welcome.summary':
    'As primeiras páginas do caderno, deixadas na mesa para o novo curador.',
  'notebook.welcome.flyleaf':
    'Bem-vindos ao Museu do Voleibol, onde a história é contada de um jeito interativo.',
  'notebook.welcome.letter':
    'Olá, novo curador! Bem-vindo ao seu novo trabalho.\n\n' +
    'A tempestade desta tarde derrubou a energia do museu inteiro, e você vai ter que religá-la sala por sala.\n\n' +
    // Why the inventory matters tonight, and where the book it is checked
    // against was left: the reason for the second and third lines of the list.
    'A seguradora só libera a reabertura com o inventário conferido por você, contra o livro de tombo do Otávio, o antigo curador, que ficou na caixa-forte. Coragem!\n\n' +
    'Reabrimos amanhã às 9h. Bom trabalho!',
  'notebook.welcome.signature': '— Helena, diretora',
  'notebook.welcome.postscript':
    'P.S.: O antigo curador deixou as coisas dele por aqui. Ele trancava tudo com datas da história do vôlei.',
  'notebook.todo.heading': 'Antes das 9h',
  // The house has one wing tonight, and the line names it (D1): «alas» was a
  // promise of rooms no lot had opened.
  'notebook.todo.power': 'Religar a energia: escritório, átrio e Ala 1',
  'notebook.todo.catalogue': 'Catalogar o acervo: conferir peça por peça',
  'notebook.todo.vault': 'Caixa-forte — só o Otávio sabia abrir',
  // Pencil, beside a line with no box: why not tonight.
  'notebook.todo.vault.note': 'hoje não: o subsolo alagou',
  // A count beside a line: «2 de 3», «Átrio 0 de 4».
  'notebook.counter': '{done} de {total}',
  'device.office-radio.title': 'Rádio da portaria',
  // The clock on the office wall stopped with the storm. Set, it shows the
  // hour of the night, which goes forward by what has been done.
  'device.office-clock.title': 'Relógio do escritório',
  'clock.set': 'Relógio acertado',
  // The telephone on the desk: it can be dialled in the dark, and the storm
  // took the line. The first line is its name, and who the subtitle says is
  // speaking.
  'device.office-telephone.title': 'Telefone',
  'device.office-telephone.prompt': 'Discar',
  'device.office-telephone.dead': 'Linha muda.',
  // The hour as the porter would say it, one phrase for each milestone of
  // the night met: spelt out and rounded, never in digits.
  'night.hour.1': 'Passa das sete',
  'night.hour.2': 'Quase oito',
  'night.hour.3': 'Passa das oito',
  'night.hour.4': 'Quase nove',
  'night.hour.5': 'Passa das nove',
  'night.hour.6': 'Quase dez',
  'night.hour.7': 'Passa das dez',
  'night.hour.8': 'Quase onze',
  // The plinth in the middle of the hall: named, and roped off until the
  // lot that gives it its medals (a dated promise, shown as «title — notice»).
  'device.atrium-podium.title': 'Plinto do Fundador',
  'device.atrium-podium.notice': 'Interditado: obra do piso.',
  'radio.speaker.porter': 'Jorge · portaria',
  // His introduction, owed to every save (L3). «De novo»: he raised the
  // roller door to let the curator in as the night began. It gives the
  // night's premises and no direction; where the hall's breaker is is the
  // call after this one, which is only said while the hall is dark. He does
  // not say «pega o rádio»: this is heard with the radio on its charger and
  // with it in the pocket, and «me chama no rádio» is true of both.
  'radio.call.hello.1': 'Curador? É o Jorge de novo, da portaria. Câmbio.',
  'radio.call.hello.2':
    'Vi no painel que a luz do escritório voltou. A tempestade desarmou os quadros do prédio inteiro.',
  'radio.call.hello.3':
    'O Otávio se aposentou hoje. Pegou o ônibus antes de a estrada fechar e deixou tudo com você.',
  'radio.call.hello.4':
    'Aqui eu tenho o painel do alarme: toda vitrine, gaveta e porta desse prédio acende uma luzinha pra mim.',
  // The porter forbids nothing that cannot be done: there is no way down yet.
  'radio.call.hello.5':
    'O relógio aí parou com a luz: acerta. O subsolo alagou; hoje ninguém desce. Qualquer coisa, me chama no rádio. Câmbio, desligo.',
  // Directions are given from where the player stands and by what they can
  // see: there is no compass in the game (`speech-uses-cardinal`). The
  // porter calls «saguão» the room every sign calls «átrio», and says so
  // once, here, before he uses the word for the rest of the night.
  'radio.call.first.1':
    'O quadro do saguão fica do outro lado, um pouco à direita de quem sai daí, junto da entrada da Ala 1. Procura a luzinha vermelha.',
  'radio.call.first.2': 'Saguão, átrio: é o mesmo lugar. A placa diz átrio; eu digo saguão. Câmbio.',
  'radio.call.notebook.1':
    'Ah, e a Helena, a diretora, deixou um caderno pra você aí na mesa. Pega antes de sair, que tá tudo explicado lá. Câmbio.',
  // One call for each milestone of the night, said once. What he knows of
  // it is what the alarm panel at the front desk shows him, and no more.
  'radio.call.atrium.1':
    'Saguão no painel! A Ala 1 é a porta com placa, perto do quadro. O quadro dela fica na parede de frente pras portas. Câmbio.',
  'radio.call.holyoke.1': 'Ala 1 acesa. Agora é conferir, peça por peça. Câmbio.',
  'radio.call.catalogued.1':
    'Uma vitrine abriu e fechou aqui no painel. Primeira conferida? Faltam… bom, faltam bastante. Câmbio.',
  'radio.call.shortcut.1':
    'A porta de serviço abriu por dentro. Agora fica destrancada dos dois lados. Tá no meu painel. Câmbio.',
  // A hint is said one height to a call: where the thing is, what it looks
  // like, how it is worked. Asked again about the same thing he says the
  // next one, and goes on repeating the last.
  'radio.hint.notebook.where': 'Primeiro o caderno: a diretora, a Helena, deixou um na mesa.',
  'radio.hint.notebook.what': 'Capa vermelha, do lado da luminária.',
  'radio.hint.notebook.how': 'Pega e lê até a última página.',
  'radio.hint.atrium.where': 'O quadro fica do outro lado do saguão.',
  'radio.hint.atrium.what': 'Luzinha vermelha, perto da porta com placa.',
  'radio.hint.atrium.how': 'Caixa cinza na parede, com alavanca. É só acionar.',
  // No side is named. The wing has two ways in once the shortcut stays
  // open, and what is to the left of one is to the right of the other: the
  // wall facing the doors and the red light are true from both
  // (`test:opening` measures every hint that names a side).
  'radio.hint.holyoke.where': 'A Ala 1 tem quadro próprio, na parede de frente pras portas.',
  'radio.hint.holyoke.what': 'Luzinha vermelha, do outro lado da sala.',
  'radio.hint.holyoke.how': 'Atravessa no escuro até a luzinha vermelha. A lanterna dá conta.',
  // Where the year is, never the year. The second way to it is the archive
  // of the wing, some metres from the portrait: «perto da entrada», not
  // «ao lado».
  'radio.hint.drawer.where': 'A gaveta do Otávio abre com um ano. O ano tá na Ala 1.',
  'radio.hint.drawer.what': 'O ano tá na Ala 1, no retrato do Morgan.',
  'radio.hint.drawer.how':
    'Pega a moldura e inclina: tá na borda de baixo. Ou no arquivo de proveniência, perto da entrada da ala.',
  // The last hint, when nothing is left to point at. Until the night has an
  // ending it says what can be done tonight; it used to send the player to
  // three medals and a vault that do not exist. It is only heard once every
  // room is lit (each dark room has a hint above it), so it gives the light
  // as done and never as work still to do.
  'radio.hint.rest':
    'O subsolo alagou; hoje ninguém desce. A luz tá feita; fora isso, hoje é só conferência. Câmbio.',

  // The radio in the player's pocket, and the porter's patience with it.
  // Jorge teases, he never insults: "curador" and "você", no "o senhor".
  'radio.speaker.static': 'Rádio',
  'radio.call.taken.1':
    'Pegou o rádio? Isso, leva com você. Daqui da portaria eu falo com o prédio inteiro.',
  'radio.call.taken.2':
    'É só apertar o botão do lado e me chamar. Só não vai me chamar toda hora, hein? Câmbio.',
  'radio.hint.notebook.curt': 'Caderno. Na mesa. Pega e lê. Câmbio.',
  // Curt is short, never vaguer: each keeps the address the full hint gives.
  'radio.hint.atrium.curt': 'Saguão. Do lado da porta da Ala 1. Luzinha vermelha. Câmbio.',
  'radio.hint.holyoke.curt': 'Ala 1. Quadro na parede do fundo. Luzinha vermelha. Vai.',
  // The year shows when the frame is picked up and tilted. The hint gives the
  // gesture, not a "plaque": none is modelled on the frame, and the one text
  // at its foot is the photograph's credit, which carries another year.
  'radio.hint.drawer.curt':
    'Gaveta do Otávio: uma data. Retrato do Morgan, Ala 1. Pega a moldura e inclina: tá na borda de baixo.',
  'radio.hint.rest.curt': 'Subsolo alagado: hoje ninguém desce. Luz feita; fora isso, só conferência.',
  'radio.patience.t1.ready': 'Portaria, pode falar.',
  'radio.patience.t1.listening': 'Fala, curador. Tô na escuta.',
  'radio.patience.t1.jorge': 'Jorge na escuta. Câmbio.',
  'radio.patience.t2.again': 'De novo, curador? Tudo bem, tudo bem.',
  'radio.patience.t2.coffee': 'Pode falar. Meu café já esfriou mesmo.',
  'radio.patience.t2.reception':
    'Só pra constar: aqui é a portaria. Recepção é aquele balcão vazio no átrio.',
  'radio.patience.t2.repeat': 'Repito, que repetir é de graça:',
  'radio.patience.t2.chat': 'Tô começando a achar que você gosta de conversar comigo.',
  'radio.patience.t3.hotline': 'Curador, isso aqui é portaria, não é Disque-Dica.',
  'radio.patience.t3.hotline.close': 'Anota no caderno, que é pra isso que ele serve.',
  'radio.patience.t3.otavio':
    'O Otávio trabalhou aqui trinta anos e me chamou duas vezes. Uma foi engano.',
  'radio.patience.t3.torch': 'Quer que eu vá aí segurar a lanterna também?',
  // Why the porter never comes: the door he raised by hand to let the
  // curator in has no motor until the mains are back, and he keeps his post.
  'radio.patience.t3.torch.close': 'Brincadeira. A porta de enrolar tá sem motor, e posto é posto.',
  'radio.patience.t3.crossword':
    'Eu tava quase fechando as palavras cruzadas. Faltava “chato”, cinco letras. Fala.',
  'radio.patience.t3.announcer':
    'Já sei de cor. Vou fazer com voz de locutor, que fica mais bonito:',
  'radio.patience.t4.please': 'Curador… pelo amor de Deus.',
  'radio.patience.t4.meter': 'Se esse rádio tivesse taxímetro, você já tava devendo o prédio.',
  'radio.patience.t4.slow': 'Vou falar bem devagarinho, que deve ser o chiado:',
  'radio.patience.t4.dark': 'É medo do escuro, é? Pode falar, eu não conto pra ninguém.',
  'radio.patience.t4.dark.close': '…Só pra Helena, a diretora, talvez.',
  'radio.patience.t4.static.1': 'Chhhh… curador… chhh… tá cortando…',
  'radio.patience.t4.static.2': '…chhh… acabando a bateria… chhhh… câmbio, desligo.',
  'radio.patience.t4.penalty.1': 'Peraí, que vai sair pênalti no radinho de pilha.',
  'radio.patience.t4.penalty.2': '…PERDEU! Tá vendo? Você me deu azar. Câmbio, desligo.',
  'radio.patience.t4.rounds.1': 'Agora não dá, curador, tô fazendo a ronda.',
  'radio.patience.t4.rounds.2':
    '…Tá, eu tô sentado. Mas é uma ronda mental. Me chama daqui a pouco.',
  'radio.patience.t5.age':
    'Curador, eu tenho sessenta e dois anos e nunca fui tão chamado na vida.',
  'radio.patience.t5.last': 'Tá. Última vez. Juro que é a última. É sempre a última.',
  'radio.patience.t5.collection':
    'Vou pôr esse rádio no acervo: “o objeto mais usado da história do museu”.',
  'radio.patience.t5.labels':
    'Sabe o que o Otávio fazia quando tinha dúvida? Lia as placas. LIA. AS. PLACAS.',
  'radio.patience.t5.babysitter': 'Eu devia ganhar adicional noturno de babá.',
  'radio.patience.t5.no.1': 'Não.',
  'radio.patience.t5.no.2': 'Câmbio, desligo. E dessa vez é sério.',
  'radio.patience.t5.recording.1':
    'Você ligou para a portaria do Museu do Voleibol. Nosso horário é das nove às seis.',
  'radio.patience.t5.recording.2':
    'Se for o curador, por favor, desligue e leia as placas. Piiii.',
  'radio.patience.t5.soap.1': 'Curador, vou desligar e ver minha novela.',
  'radio.patience.t5.soap.2':
    '…Que não tem, porque acabou a luz. Sobrou você. Câmbio, desligo.',
  'radio.patience.t5.song.1':
    '(cantarolando) Ô curador, ô curador, me deixa em paz, por favor…',
  'radio.patience.t5.song.2': 'Gostou? É inédita. Agora deixa eu descansar a voz.',
  'radio.patience.praise.went': 'Olha só, andou, hein? Gostei de ver.',
  'radio.patience.praise.knack': 'Agora sim, curador. Tá pegando o jeito.',
  'radio.patience.praise.needless': 'Viu? Nem precisava tanto de mim. Mas, já que chamou:',
  'radio.deadAir.noAnswer': '(Chiado. Ninguém responde na portaria.)',
  'radio.deadAir.reallyOff': '(Só chiado. O Jorge desligou mesmo.)',
  // Only the rain: the house has no window for it to beat on until the
  // skylight is in the shell. Said while it rains (`flagsUnset`).
  'radio.deadAir.rain': '(Nada. Só a chuva.)',

  // ---------------------------------------------------------------------
  // Wall lettering. Vinyl on plaster, so it has to survive being read at a
  // glance from twelve metres away — short lines, no subordinate clauses.
  // ---------------------------------------------------------------------
  // The game dates from 1895, not the museum: the line has to say which.
  'sign.atrium.eyebrow': 'O JOGO DESDE 1895 · MEMÓRIA EM MOVIMENTO',
  'sign.atrium.heading': 'MUSEU DO VOLEIBOL',
  'sign.atrium.body':
    'Um jogo inventado em 1895 para quem achava o basquete pesado demais.\n' +
    'Reabertura amanhã. Você é quem termina a montagem.',

  // ---------------------------------------------------------------------
  // Wing 1 — Holyoke. Eight wall labels, no more.
  // ---------------------------------------------------------------------
  // Átrio — a bola através do tempo.
  'exhibit.atrium-ball-laced.title': 'Couro, costura e cadarço',
  'exhibit.atrium-ball-laced.label':
    'Antes da válvula embutida, era preciso abrir a cobertura para alcançar a câmara. Esta reconstrução reúne a forma vista em catálogos de época e em uma bola preservada: couro, costuras salientes e cadarço cruzado.',
  'exhibit.atrium-ball-laced.catalogue':
    'Bola de voleibol com cadarço, c. 1900–1925. Reconstrução tipológica, não uma réplica da bola original de 1895. Doze gomos largos formam uma esfera ligeiramente mole; o couro castanho-oliva escurece nas costuras, e a abertura alongada recebe um fechamento de couro cru.',
  'hotspot.atrium-ball-laced.lacing.label':
    'Abertura oval fechada por cadarço cruzado, antes da válvula moderna',
  'hotspot.atrium-ball-laced.seam.label':
    'Costura externa levemente saliente, sujeita a desgaste e deformação',

  'exhibit.atrium-ball-tokyo-1964.title': 'A bola entra nos Jogos',
  'exhibit.atrium-ball-tokyo-1964.label':
    'Tóquio 1964 recebeu o primeiro torneio olímpico de voleibol. As bolas oficiais preservadas mostram dezoito painéis em seis trios, couro branco-marfim e canais estreitos entre os painéis. A ficha do acervo não identifica o fabricante desta reconstrução.',
  'exhibit.atrium-ball-tokyo-1964.catalogue':
    'Bola oficial de Tóquio 1964, reconstrução sem marcas. O exemplar não usado preservado pelo Japan Sport Council é marfim, com grão fino, canais amarelados e pequenas manchas ocres. O exemplar usado está escurecido, vincado e deformado — sinais que inspiram o desgaste discreto deste modelo.',
  'hotspot.atrium-ball-tokyo-1964.panels.label':
    'Dezoito painéis quase retangulares, organizados em seis grupos de três',
  'hotspot.atrium-ball-tokyo-1964.seam.label':
    'Canal estreito e rebaixado entre os painéis',

  'exhibit.atrium-ball-colour-1998.title': 'O jogo ganha cor',
  'exhibit.atrium-ball-colour-1998.label':
    'No Mundial de 1998, a bola oficial passou a usar branco, amarelo e azul para ganhar leitura em quadra e na transmissão. A MVL200 manteve a construção clássica: dezoito painéis, agora organizados em grandes faixas contrastantes.',
  'exhibit.atrium-ball-colour-1998.catalogue':
    'Mikasa MVL200, desenho adotado no Campeonato Mundial de 1998. Reconstrução sem logotipos. Os seis trios alternam branco–amarelo–branco e azul–amarelo–azul; a cobertura tem grão fino, brilho acetinado e canais rebaixados, sem as covinhas da geração seguinte.',
  'hotspot.atrium-ball-colour-1998.sequence.label':
    'Sequências branco–amarelo–branco e azul–amarelo–azul',
  'hotspot.atrium-ball-colour-1998.seam.label':
    'Canal estreito e rebaixado entre os painéis coloridos',

  'exhibit.atrium-ball-eight-panel-2008.title': 'Oito gomos, superfície com covinhas',
  'exhibit.atrium-ball-eight-panel-2008.label':
    'Apresentada em 2008, a MVA200 trocou os dezoito painéis por oito pétalas curvas. Azul-violeta e amarelo formam uma espiral; covinhas rasas e microtextura cobrem toda a superfície. A mudança alterou tanto a leitura visual quanto o contato com o ar.',
  'exhibit.atrium-ball-eight-panel-2008.catalogue':
    'Mikasa MVA200, 2008. Reconstrução sem marcas olímpicas, FIVB ou do fabricante. Oito painéis curvos unidos sem pesponto aparente formam pequenas rosetas nos encontros. A cobertura de microfibra e poliuretano combina cavidades regulares com textura mais fina entre elas.',
  'hotspot.atrium-ball-eight-panel-2008.panels.label':
    'Oito painéis em forma de pétala, reunidos num desenho helicoidal',
  'hotspot.atrium-ball-eight-panel-2008.dimples.label':
    'Covinhas rasas sobre uma segunda camada de microtextura',

  'exhibit.ball-improvised.title': 'A bola que não existia',
  // The order and the words are Morgan's own: the bladder first, then the
  // whole basketball.
  'exhibit.ball-improvised.label':
    'Morgan testou primeiro a câmara de uma bola de basquete: leve e lenta demais. Depois a bola inteira: grande e pesada demais. Sem uma bola adequada, o jogo recém-inventado não funcionava. A solução veio de uma encomenda.',
  'exhibit.ball-improvised.catalogue':
    'Câmara de borracha de bola de basquete, c. 1895. Reprodução. Nas palavras de Morgan, leve e lenta demais; a bola de basquete inteira, grande e pesada demais. Foi essa insuficiência que levou à encomenda à Spalding.',

  'exhibit.ball-spalding.title': 'A bola Spalding de cadarço',
  'exhibit.ball-spalding.label':
    'A A.G. Spalding & Bros. tinha fábrica em Chicopee, perto de Holyoke. Morgan pediu a ela uma bola sob medida: câmara de borracha em capa de couro, com 25 a 27 polegadas de circunferência. Esta é uma reconstrução.',
  'exhibit.ball-spalding.catalogue':
    'Bola de vôlei Spalding, couro curtido com costura externa em linha encerada e fechamento por cadarço. O cadarço é o detalhe que situa a peça no tempo: a bola de cadarço foi saindo de cena entre os anos 1920 e 1940.',
  'hotspot.ball-spalding.lacing.label': 'Cadarço de couro cru sobre a abertura de inflagem',
  'hotspot.ball-spalding.maker.label': 'Marca em relevo do fabricante, no gomo oposto',
  'hotspot.ball-spalding.seam.label': 'Costura externa erguida, feita à mão',

  'exhibit.net-1897.title': 'A rede de 1,98 metro',
  'exhibit.net-1897.label':
    'A primeira rede ficava a 6 pés e 6 polegadas, logo acima da cabeça de um homem médio. Pelo manual de 1897, tinha ao menos 2 pés de largura por 27 de comprimento, em quadra de 25 por 50 pés.',
  'exhibit.net-1897.catalogue':
    'Rede de corda de algodão com fita de lona nas bordas e postes de madeira em soquetes de ferro fundido no piso. A altura baixa não é acidente: o jogo foi desenhado para ser fácil, para homens de meia-idade que achavam o basquete pesado demais.',
  'hotspot.net-1897.tape.label': 'Fita de lona costurada na borda superior',
  'hotspot.net-1897.socket.label': 'Soquete de ferro fundido embutido no piso',

  'exhibit.handbook-1897.title': 'O primeiro manual oficial',
  'exhibit.handbook-1897.label':
    'O Official Handbook da Liga Atlética da YMCA, de 1897, é o primeiro manual oficial: quadra de 25 por 50 pés, rede a 6 pés e 6 polegadas, bola de 25 a 27 polegadas. A partida tinha nove innings.',
  // The year before is left as "a year earlier": the drawer's code is printed
  // on the portrait's plaque and on one document title, and nowhere else.
  'exhibit.handbook-1897.catalogue':
    'Official Handbook of the Athletic League of the Y.M.C.A. of North America, 1897. Fac-símile. As dez regras originais haviam saído um ano antes, em julho, na revista Physical Education. O nome foi grafado em duas palavras — volley ball — até 1952, quando a associação americana adotou a forma em uma palavra.',
  'hotspot.handbook-1897.innings.label': 'A cláusula dos nove innings, herdada do beisebol',
  'hotspot.handbook-1897.ball-spec.label': 'Especificação da bola: 25 a 27 polegadas, 9 a 12 onças',

  // The Filipino attack rests on one publisher and "bomberino" on none that
  // could be opened: it stays in the catalogue entry, as what it "became
  // known as", until it has a document of its own.
  // The label says only what two publishers say: that Woods and Lynch helped
  // with the first rules. That Morgan wrote of it in this guide rests on the
  // Hall of Fame alone (page 11), so it is told in the catalogue entry and on
  // the detail. The title still leans on that one source: two lines of the
  // plan disagree there, and the owner settles it before L8.
  'exhibit.guide-1916.title': 'Morgan conta a história',
  'exhibit.guide-1916.label':
    'O Dr. Frank Woods e o chefe dos bombeiros John Lynch, de Holyoke, ajudaram Morgan a redigir as primeiras regras do jogo. Este guia de vôlei da Spalding, edição de 1916–17, saiu duas décadas depois da invenção.',
  'exhibit.guide-1916.catalogue':
    'Spalding Athletic Library — Volley Ball Guide, edição de 1916–17. Foi nele que Morgan creditou o Dr. Frank Woods e o chefe dos bombeiros John Lynch pelas contribuições às primeiras regras. Da mesma década é o ataque que ficou conhecido como bomba filipina: um passe alto e, em seguida, um golpe para baixo.',
  'hotspot.guide-1916.credit.label': 'Morgan credita Frank Woods e John Lynch',
  // One author's estimate in the guide, not a count of anybody.
  'hotspot.guide-1916.census.label':
    'Estimativa de 1916: cerca de 200 mil praticantes nos Estados Unidos',

  // No catalogue has been opened and captured, and nobody photographed the
  // members of 1895: the cards give no date and say what the museum does not
  // know, instead of the research's inference dressed as knowledge.
  'exhibit.gym-suit.title': 'O traje de ginásio de catálogo',
  'exhibit.gym-suit.label':
    'Malha de lã canelada e calça até o joelho: traje de ginásio de catálogo, feito pelo museu. O museu não achou fotografia dos sócios de 1895 e não sabe o que eles vestiam.',
  'exhibit.gym-suit.catalogue':
    'Traje de ginásio como os dos catálogos de artigos esportivos de época. Reprodução. Morgan explicou o jogo pela idade e pelo fôlego dos sócios, não pela roupa: era recreação para homens de meia-idade que achavam o basquete pesado demais.',

  'exhibit.portrait-morgan.title': 'William G. Morgan',
  'exhibit.portrait-morgan.label':
    'Diretor de educação física da YMCA de Holyoke. Em 1895, aos 25 anos, criou um jogo sem contato para sócios mais velhos e sedentários. Chamou-o de Mintonette. Havia conhecido James Naismith, o inventor do basquete, no início dos anos 1890.',
  // Where the sources part, the entry says so instead of choosing: the day of
  // his death (27 or 28 December) and the occasion of the renaming. The year
  // of the renaming is the drawer's code and is not repeated here.
  'exhibit.portrait-morgan.catalogue':
    'William George Morgan (Lockport, Nova York, 23 de janeiro de 1870 — dezembro de 1942). Formou-se pela International YMCA Training School em 1894 e assumiu Holyoke em 30 de agosto de 1895. No ano seguinte, em Springfield, aceitou trocar o nome Mintonette por Volley Ball; se foi numa visita ou na demonstração da conferência da YMCA, as fontes divergem. Deixou a YMCA em 1897 para trabalhar na indústria.',
  'hotspot.portrait-morgan.date.label':
    'Plaqueta da moldura: em 1896, em Springfield, o Mintonette passou a se chamar Volley Ball',

  'exhibit.photo-gym.title': 'O ginásio onde aconteceu',
  // The label describes what the photograph shows; 1897 is when it was
  // published, which is all its credit says.
  'exhibit.photo-gym.label':
    'O ginásio da YMCA de Holyoke, em fotografia publicada em 1897: argolas, cavalo de salto, pesos de polia e, no alto, a pista de corrida suspensa. Foi neste espaço que a primeira partida foi jogada.',
  'exhibit.photo-gym.catalogue':
    'Interior do antigo prédio da YMCA de Holyoke. Reprodução de fotografia publicada em 1897 na Transcript Industrial Edition. O prédio, do começo dos anos 1890, queimou em 1943. Daqui saíram os dois times de cinco jogadores que Morgan levou a Springfield para demonstrar o jogo.',

  // ---------------------------------------------------------------------
  // Documents — the archive layer, behind drawers
  // ---------------------------------------------------------------------
  'document.invention-date.title': 'Nota de proveniência: a data contestada',
  'document.invention-date.body':
    'A data de 9 de fevereiro de 1895, repetida em quase toda parte, não resiste ao arquivo. O International Volleyball Hall of Fame não encontrou citação verificável para ela e estabeleceu que o posto de Morgan em Auburn, no Maine, só terminou em agosto de 1895, e que ele assumiu Holyoke em 30 de agosto. Pela conta do Hall da Fama, a invenção cai provavelmente em dezembro de 1895. Nesta ala, portanto, as placas dizem apenas 1895.',

  // The title carries the year (the second of the two keys allowed to); the
  // body tells what the sources agree on and then says where they do not.
  'document.halstead.title': 'Springfield, 1896',
  'document.halstead.body':
    'Morgan demonstrou o jogo no ginásio leste da International YMCA Training School, na conferência de diretores de educação física da YMCA, a convite de Luther Halsey Gulick. Levou dois times de cinco homens de Holyoke, capitaneados pelo prefeito James J. Curran e pelo chefe dos bombeiros John Lynch. Foi o professor Alfred T. Halstead quem propôs trocar Mintonette por Volley Ball, e Morgan aceitou. As fontes divergem sobre a ocasião: o Hall da Fama fala de uma visita no início do ano e data a conferência de 7 de julho; a federação internacional põe a sugestão depois da demonstração.',

  // Scores are spelt out: a bare 15 or 21 on a card is a number a later lock
  // may want for itself.
  'document.rule-changes.title': 'As mudanças que criaram o jogo moderno',
  'document.rule-changes.body':
    'Em 1917 a partida encurtou de vinte e um para quinze pontos. Em 1918 o número de jogadores foi fixado em seis por lado. Em 1920 vieram duas regras: no máximo três toques por equipe e restrição ao ataque vindo do fundo da quadra. Sobre os três toques as fontes divergem: a federação internacional diz 1922.',

  // ---------------------------------------------------------------------
  // Facts
  // ---------------------------------------------------------------------
  'fact.springfield-renaming.claim': 'Ano em que Mintonette passou a se chamar Volley Ball',
  'fact.first-rulebook.claim': 'Ano do primeiro manual oficial',
  'fact.filipino-spike.claim': 'Ano em que o ataque cortado surgiu nas Filipinas',
  'fact.six-a-side.claim': 'Ano em que o número de jogadores foi fixado em seis',

  // ---------------------------------------------------------------------
  // Locks
  // ---------------------------------------------------------------------
  'lock.office-drawer.mapLabel': 'Gaveta com segredo — 4 dígitos',
  // After the drawer's name while it is shut: «Gaveta do Otávio — trancada (um ano)».
  'lock.office-drawer.prompt': 'trancada (um ano)',
  'lock.hint.highlight': 'A placa correta acendeu.',
  'lock.hint.audio': 'A gravação do docente repete o ano.',
  'lock.hint.reveal': 'O disco travou no dígito certo.',
} as const

export type TranslationKey = keyof typeof ptBR
