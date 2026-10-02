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
  'ui.title': 'Museu do Vôlei',
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
  'radio.taken': 'Você pegou o rádio',
  'radio.taken.keyboard': 'R chama a portaria, de qualquer sala.',
  'radio.taken.touch': 'O ícone do rádio chama a portaria, de qualquer sala.',
  'ui.radio.hungUp': 'O Jorge desligou. Tente daqui a pouco.',

  // Prompts
  'prompt.examine': 'Examinar',
  'prompt.read': 'Ler',
  'prompt.open': 'Abrir',
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
  'power.restored': 'Energia restaurada',
  'radio.skip': 'Pular',
  'notebook.next': 'Virar a página',
  'notebook.previous': 'Voltar',

  // Map
  'map.title': 'Planta do museu',
  'map.state.unlit': 'Sem energia',
  'map.state.partial': 'Peças por catalogar',
  'map.state.complete': 'Catalogada',
  'map.legend': 'Legenda',

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
  'container.office.title': 'Gaveta trancada do curador',
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
  'prompt.journal': 'Caderno',
  'container.holyoke-a.title': 'Arquivo — proveniência',
  'container.holyoke-b.title': 'Arquivo — regulamentos',

  // The narrative alibi for everything: the dark, the torch, the drawers,
  // the catalogue, the office, the vault, the ending.
  'intro.line1': 'Você é o novo curador.',
  'intro.line2': 'É a noite anterior à reabertura. A energia caiu.',
  'intro.line3': 'Seu antecessor deixou alguma coisa no cofre.',

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
    'Bem-vindos ao Museu do Vôlei, onde a história é contada de um jeito interativo.',
  'notebook.welcome.letter':
    'Olá, novo curador! Bem-vindo ao seu novo trabalho.\n\n' +
    'A tempestade desta tarde derrubou a energia do museu inteiro, e você vai ter que religá-la sala por sala.\n\n' +
    'Reabrimos amanhã às 9h. Bom trabalho!',
  'notebook.welcome.signature': '— Helena, diretora',
  'notebook.welcome.postscript':
    'P.S.: O antigo curador deixou as coisas dele por aqui. Ele trancava tudo com datas da história do vôlei.',
  'notebook.todo.heading': 'Antes das 9h',
  'notebook.todo.power': 'Religar a energia: escritório, átrio e alas',
  'notebook.todo.catalogue': 'Catalogar o acervo',
  'notebook.todo.vault': 'Cofre — só o Otávio sabia abrir',
  'device.office-radio.title': 'Rádio da portaria',
  'radio.speaker.porter': 'Jorge · portaria',
  'radio.call.first.1': 'Curador? Aqui é o Jorge, da portaria. Câmbio.',
  'radio.call.first.2':
    'Vi no painel que a luz do escritório voltou. A tempestade desarmou os quadros do prédio inteiro.',
  'radio.call.first.3':
    'O quadro do átrio fica na parede oeste, do lado da entrada da Ala 1. Procure a luzinha vermelha.',
  'radio.call.first.4':
    'E não desce no subsolo, que alagou. Qualquer coisa, pega o rádio aí na mesa e me chama. Câmbio, desligo.',
  'radio.call.notebook.1':
    'Ah, e a Helena deixou um caderno pra você aí na mesa. Pega antes de sair, que tá tudo explicado lá. Câmbio.',
  'radio.hint.notebook':
    'Primeiro o caderno, curador: a Helena deixou um pra você na mesa do escritório. Tá tudo explicado lá.',
  'radio.hint.atrium':
    'O quadro do átrio fica na parede oeste, perto da entrada da Ala 1. A luzinha vermelha mostra onde.',
  'radio.hint.holyoke':
    'A Ala 1 tem um quadro de força só dela, lá dentro. Pode atravessar no escuro mesmo: a lanterna dá conta.',
  'radio.hint.drawer':
    'Aquela gaveta trancada do escritório? O Otávio usava datas que estão nas placas. Dá uma olhada no retrato do Morgan, na Ala 1.',
  'radio.hint.vault':
    'Agora é com você, curador. O Otávio vivia falando de três medalhas e de um cofre embaixo do átrio. Câmbio.',

  // The radio in the player's pocket, and the porter's patience with it.
  // Jorge teases, he never insults: "curador" and "você", no "o senhor".
  'radio.speaker.static': 'Rádio',
  'radio.call.taken.1':
    'Pegou o rádio? Isso, leva com você. Daqui da portaria eu falo com o prédio inteiro.',
  'radio.call.taken.2':
    'É só apertar o botão do lado e me chamar. Só não vai me chamar toda hora, hein? Câmbio.',
  'radio.hint.notebook.curt': 'Caderno. Na mesa. Pega e lê. Câmbio.',
  'radio.hint.atrium.curt': 'Átrio. Parede oeste. Luzinha vermelha. Câmbio.',
  'radio.hint.holyoke.curt': 'Ala 1. Quadro lá dentro. Lanterna na mão. Vai.',
  'radio.hint.drawer.curt': 'Gaveta do Otávio: uma data. A data tá nas placas da Ala 1. Lê.',
  'radio.hint.vault.curt': 'Três medalhas. Um cofre. Embaixo do átrio. O resto é com você.',
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
  'radio.patience.t3.crossword':
    'Eu tava quase fechando as palavras cruzadas. Faltava “chato”, cinco letras. Fala.',
  'radio.patience.t3.announcer':
    'Já sei de cor. Vou fazer com voz de locutor, que fica mais bonito:',
  'radio.patience.t4.please': 'Curador… pelo amor de Deus.',
  'radio.patience.t4.meter': 'Se esse rádio tivesse taxímetro, você já tava devendo o prédio.',
  'radio.patience.t4.slow': 'Vou falar bem devagarinho, que deve ser o chiado:',
  'radio.patience.t4.dark': 'É medo do escuro, é? Pode falar, eu não conto pra ninguém.',
  'radio.patience.t4.dark.close': '…Só pra Helena, talvez.',
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
    'Você ligou para a portaria do Museu do Vôlei. Nosso horário é das nove às seis.',
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
  'radio.deadAir.rain': '(Nada. Só a chuva batendo nas janelas.)',

  // ---------------------------------------------------------------------
  // Wall lettering. Vinyl on plaster, so it has to survive being read at a
  // glance from twelve metres away — short lines, no subordinate clauses.
  // ---------------------------------------------------------------------
  'sign.atrium.eyebrow': 'DESDE 1895 · MEMÓRIA EM MOVIMENTO',
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
    'Antes da válvula embutida, era preciso abrir a cobertura para alcançar a câmara. Esta reconstrução reúne a forma vista em catálogos de 1918–1920 e em uma bola preservada de cerca de 1925: couro, costuras salientes e cadarço cruzado.',
  'exhibit.atrium-ball-laced.catalogue':
    'Bola de voleibol com cadarço, c. 1900–1925. Reconstrução tipológica, não uma réplica da bola original de 1895. Doze gomos largos formam uma esfera ligeiramente mole; o couro castanho-oliva escurece nas costuras, e a abertura alongada recebe um fechamento de couro cru.',
  'hotspot.atrium-ball-laced.lacing.label':
    'Abertura oval fechada por cadarço cruzado, antes da válvula moderna',
  'hotspot.atrium-ball-laced.seam.label':
    'Costura externa levemente saliente, sujeita a desgaste e deformação',

  'exhibit.atrium-ball-tokyo-1964.title': 'A bola entra nos Jogos',
  'exhibit.atrium-ball-tokyo-1964.label':
    'Tóquio 1964 recebeu o primeiro torneio olímpico de voleibol. As bolas oficiais preservadas mostram dezoito painéis em seis trios, couro branco-marfim e canais estreitos de costura. A ficha do acervo não identifica o fabricante desta reconstrução.',
  'exhibit.atrium-ball-tokyo-1964.catalogue':
    'Bola oficial de Tóquio 1964, reconstrução sem marcas. O exemplar não usado preservado pelo Japan Sport Council é marfim, com grão fino, costuras amareladas e pequenas manchas ocres. O exemplar usado está escurecido, vincado e deformado — sinais que inspiram o desgaste discreto deste modelo.',
  'hotspot.atrium-ball-tokyo-1964.panels.label':
    'Dezoito painéis quase retangulares, organizados em seis grupos de três',
  'hotspot.atrium-ball-tokyo-1964.seam.label':
    'Canal de costura estreito e rebaixado, sem fio exposto',

  'exhibit.atrium-ball-colour-1998.title': 'O jogo ganha cor',
  'exhibit.atrium-ball-colour-1998.label':
    'No Mundial de 1998, a bola oficial passou a usar branco, amarelo e azul para ganhar leitura em quadra e na transmissão. A MVL200 manteve a construção clássica: dezoito painéis costurados à mão, agora organizados em grandes faixas contrastantes.',
  'exhibit.atrium-ball-colour-1998.catalogue':
    'Mikasa MVL200, desenho adotado no Campeonato Mundial de 1998. Reconstrução sem logotipos. Os seis trios alternam branco–amarelo–branco e azul–amarelo–azul; a cobertura tem grão fino, brilho acetinado e costuras rebaixadas, sem os dimples da geração seguinte.',
  'hotspot.atrium-ball-colour-1998.sequence.label':
    'Sequências branco–amarelo–branco e azul–amarelo–azul',
  'hotspot.atrium-ball-colour-1998.seam.label':
    'Painéis costurados à mão; o fio permanece escondido no canal',

  'exhibit.atrium-ball-eight-panel-2008.title': 'Oito gomos, milhares de dimples',
  'exhibit.atrium-ball-eight-panel-2008.label':
    'Apresentada em 2008, a MVA200 trocou os dezoito painéis por oito pétalas curvas. Azul-violeta e amarelo formam uma espiral; dimples rasos e microtextura cobrem toda a superfície. A mudança alterou tanto a leitura visual quanto o contato com o ar.',
  'exhibit.atrium-ball-eight-panel-2008.catalogue':
    'Mikasa MVA200, 2008. Reconstrução sem marcas olímpicas, FIVB ou do fabricante. Oito painéis curvos unidos sem pesponto aparente formam pequenas rosetas nos encontros. A cobertura de microfibra e poliuretano combina cavidades regulares com textura mais fina entre elas.',
  'hotspot.atrium-ball-eight-panel-2008.panels.label':
    'Oito painéis em forma de pétala, reunidos num desenho helicoidal',
  'hotspot.atrium-ball-eight-panel-2008.dimples.label':
    'Dimples rasos sobre uma segunda camada de microtextura',

  'exhibit.ball-improvised.title': 'A bola que não existia',
  'exhibit.ball-improvised.label':
    'Morgan testou primeiro uma bola de basquete: pesada demais. Depois a câmara nua, sem o couro: leve demais, boiava. Sem uma bola adequada, o jogo que ele tinha acabado de inventar não funcionava. A solução veio de uma encomenda.',
  'exhibit.ball-improvised.catalogue':
    'Câmara de borracha de bola de basquete, c. 1895. Reprodução. O primeiro objeto da história do vôlei é um fracasso: mole demais para descer, leve demais para cruzar a rede com intenção. Foi essa insuficiência que gerou a encomenda à Spalding.',

  'exhibit.ball-spalding.title': 'A bola Spalding de cadarço',
  'exhibit.ball-spalding.label':
    'A A.G. Spalding & Bros. tinha fábrica em Chicopee Falls, a poucos quilômetros de Holyoke. Morgan encomendou uma bola sob medida: câmara de borracha dentro de couro costurado à mão, fechada por um cadarço de couro cru. Cerca de 25 polegadas de circunferência.',
  'exhibit.ball-spalding.catalogue':
    'Bola de vôlei Spalding, couro curtido com costura externa em linha encerada e fechamento por cadarço, c. 1900–1920. O cadarço é o detalhe que data a peça: sobreviveu até os anos 1930 e sumiu quando a bola sem cadarço virou padrão oficial.',
  'hotspot.ball-spalding.lacing.label': 'Cadarço de couro cru sobre a abertura de inflagem',
  'hotspot.ball-spalding.maker.label': 'Marca em relevo do fabricante, no gomo oposto',
  'hotspot.ball-spalding.seam.label': 'Costura externa erguida, feita à mão',

  'exhibit.net-1897.title': 'A rede de 1,98 metro',
  'exhibit.net-1897.label':
    'A primeira rede ficava a 6 pés e 6 polegadas do chão — cerca de meio pé acima da cabeça de um homem médio da época. A quadra media 25 por 50 pés. O regulamento de 1897 exigia rede de no mínimo 2 pés de largura por 27 de comprimento.',
  'exhibit.net-1897.catalogue':
    'Rede de corda de algodão com fita de lona nas bordas e postes de madeira em soquetes de ferro fundido no piso. A altura baixa não é acidente: o jogo foi desenhado para ser fácil, para homens de meia-idade que achavam o basquete pesado demais.',
  'hotspot.net-1897.tape.label': 'Fita de lona costurada na borda superior',
  'hotspot.net-1897.socket.label': 'Soquete de ferro fundido embutido no piso',

  'exhibit.handbook-1897.title': 'O primeiro regulamento impresso',
  'exhibit.handbook-1897.label':
    'O Official Handbook da Liga Atlética da YMCA da América do Norte, de 1897, traz as primeiras especificações publicadas: quadra de 25 por 50 pés, rede a 6 pés e 6 polegadas, bola de 25 a 27 polegadas de circunferência pesando de 9 a 12 onças. A partida tinha nove innings.',
  'exhibit.handbook-1897.catalogue':
    'Official Handbook of the Athletic League of the Y.M.C.A. of North America, 1897. Fac-símile. As dez regras originais haviam saído um ano antes, na edição de julho de 1896 da revista Physical Education. O nome permaneceu grafado em duas palavras — volley ball — até 1952.',
  'hotspot.handbook-1897.innings.label': 'A cláusula dos nove innings, herdada do beisebol',
  'hotspot.handbook-1897.ball-spec.label': 'Especificação da bola: 25 a 27 polegadas, 9 a 12 onças',

  'exhibit.guide-1916.title': 'O guia que registrou a bomba',
  'exhibit.guide-1916.label':
    'Nas Filipinas, por volta de 1916, jogadores criaram a combinação que mudaria tudo: um passe alto seguido de um segundo jogador batendo a bola para baixo. Chamavam o golpe de bomba e o batedor de bomberino. Os americanos chamaram de bomba filipina.',
  'exhibit.guide-1916.catalogue':
    'Spalding Athletic Library — Volley Ball Guide, edição de 1916–17. Foi nele que Morgan creditou formalmente o Dr. Frank Wood e o chefe dos bombeiros John Lynch pelas contribuições às primeiras regras. O ataque filipino forçou as mudanças que vieram em seguida.',
  'hotspot.guide-1916.credit.label': 'Morgan credita Frank Wood e John Lynch',
  'hotspot.guide-1916.census.label': 'Censo de 1916: cerca de 200 mil praticantes nos Estados Unidos',

  'exhibit.gym-suit.title': 'O uniforme de ginásio',
  'exhibit.gym-suit.label':
    'Lã penteada canelada, calça até o joelho, sapatilha de lona com sola de borracha. Nada de tecido sintético, nada de branco plástico: tudo é pigmento, tintura ou óxido. O vôlei nasceu dentro do vestuário de ginástica vitoriano, não do vestuário esportivo.',
  'exhibit.gym-suit.catalogue':
    'Traje de ginásio da YMCA, c. 1895–1915. Reprodução. A malha de lã pesava e retinha suor, o que ajuda a explicar por que o jogo foi projetado sem contato e com rede baixa: era recreação para o corpo de meia-idade, não competição.',

  'exhibit.portrait-morgan.title': 'William G. Morgan',
  'exhibit.portrait-morgan.label':
    'Diretor de educação física da YMCA de Holyoke, Massachusetts. Em 1895, aos 25 anos, criou um jogo sem contato para sócios mais velhos e sedentários. Chamou-o de Mintonette. Havia conhecido James Naismith, o inventor do basquete, em 1891.',
  'exhibit.portrait-morgan.catalogue':
    'William George Morgan (Lockport, Nova York, 23 de janeiro de 1870 — 27 de dezembro de 1942). Formou-se pela International YMCA Training School em 1894 e assumiu Holyoke em 30 de agosto de 1895. Em julho de 1896, ao demonstrar o jogo numa conferência da YMCA em Springfield, aceitou trocar o nome Mintonette por Volley Ball. Deixou a YMCA em 1900 para trabalhar na indústria.',
  'hotspot.portrait-morgan.date.label':
    'Plaqueta da moldura: em 1896, numa demonstração em Springfield, o Mintonette passou a se chamar Volley Ball',

  'exhibit.photo-gym.title': 'O ginásio onde aconteceu',
  'exhibit.photo-gym.label':
    'O ginásio da YMCA de Holyoke, fotografado em 1897, na esquina das ruas High e Appleton. Piso de madeira, treliças de aço rebitado, aparelhos de ginástica encostados na parede. Foi neste espaço que a primeira partida foi jogada.',
  'exhibit.photo-gym.catalogue':
    'Interior do antigo prédio da YMCA de Holyoke, 1897. O edifício serviu de 1886 a 1943. Em 7 de julho de 1896, Morgan levou dois times de cinco jogadores de Holyoke a Springfield para demonstrar o jogo — foi lá que ele ganhou o nome definitivo.',

  // ---------------------------------------------------------------------
  // Documents — the archive layer, behind drawers
  // ---------------------------------------------------------------------
  'document.invention-date.title': 'Nota de proveniência: a data contestada',
  'document.invention-date.body':
    'A data de 9 de fevereiro de 1895, repetida em quase toda parte, não resiste ao arquivo. O International Volleyball Hall of Fame não encontrou citação verificável para ela e estabeleceu que o posto de Morgan em Auburn, no Maine, só terminou em agosto de 1895, e que ele assumiu Holyoke em 30 de agosto. A instituição situa a invenção em dezembro de 1895. Nesta ala, portanto, as placas dizem apenas 1895.',

  'document.halstead.title': 'Springfield, 7 de julho de 1896',
  'document.halstead.body':
    'Morgan demonstrou o jogo no ginásio leste da International YMCA Training School, durante a conferência de diretores de educação física convocada por Luther Halsey Gulick. Levou dois times de cinco homens de Holyoke, capitaneados pelo prefeito James J. Curran e pelo chefe dos bombeiros John Lynch. O professor Alfred T. Halstead, assistindo ao caráter de voleio da partida, propôs trocar Mintonette por Volley Ball. Morgan aceitou.',

  'document.rule-changes.title': 'As mudanças que criaram o jogo moderno',
  'document.rule-changes.body':
    'Em 1917 a partida encurtou de 21 para 15 pontos. Em 1918 o número de jogadores foi fixado em seis por lado. Em 1920 vieram as duas regras que definem o vôlei até hoje: no máximo três toques por equipe e restrição ao ataque vindo do fundo da quadra. As três respondem ao mesmo problema — o ataque inventado nas Filipinas havia desequilibrado o jogo.',

  // ---------------------------------------------------------------------
  // Facts
  // ---------------------------------------------------------------------
  'fact.springfield-renaming.claim': 'Ano em que Mintonette passou a se chamar Volley Ball',
  'fact.first-rulebook.claim': 'Ano do primeiro regulamento oficial impresso',
  'fact.filipino-spike.claim': 'Ano em que o ataque cortado surgiu nas Filipinas',
  'fact.six-a-side.claim': 'Ano em que o número de jogadores foi fixado em seis',

  // ---------------------------------------------------------------------
  // Locks
  // ---------------------------------------------------------------------
  'lock.office-drawer.mapLabel': 'Gaveta com segredo — 4 dígitos',
  'lock.holyoke-power.mapLabel': 'Quadro de força — alavanca',
  'lock.hint.highlight': 'A placa correta acendeu.',
  'lock.hint.audio': 'A gravação do docente repete o ano.',
  'lock.hint.reveal': 'O disco travou no dígito certo.',
} as const

export type TranslationKey = keyof typeof ptBR
