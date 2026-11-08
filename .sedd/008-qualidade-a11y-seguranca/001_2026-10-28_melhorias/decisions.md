# Decisions — Migration 001

**Feature:** 008-qualidade-a11y-seguranca
**Migration:** 001
**Date:** 2026-10-28

---

## D001-001 — Trabalhar na branch `004-series-tracking`

**Decisão:** Registrar a feature 008 em `.sedd/` sem criar branch nova.

**Alternativas consideradas:**
- Criar `008-qualidade-a11y-seguranca` (padrão do `/sedd.specify`) → não escolhido pelo usuário.

**Por que essa:** escolha do usuário em 2026-10-28.

**Impacto:** os hooks do SEDD continuam mostrando o contexto da 004; commits desta feature devem usar o id `008` na mensagem (`{{type}}(008): ...`).

---

## D001-002 — Escape no ponto de interpolação, não sanitizador de HTML

**Decisão:** `escapeHtml()` simples aplicada em cada `${...}` dinâmico dentro de template HTML.

**Alternativas consideradas:**
- DOMPurify → rejeitado: dependência externa para um app sem build; nenhum ponto precisa aceitar HTML do usuário.
- Reescrever tudo com `textContent`/`createElement` → adiado para FR-032/FR-033 (migração para módulos).

**Por que essa:** menor mudança que elimina o XSS hoje, e a função já fica em `src/utils/` para a migração.

---

## D001-003 — Acessibilidade dos modais via `MutationObserver`

**Decisão:** Observar o atributo `style` dos `.modal-overlay` em vez de alterar cada ponto que abre/fecha.

**Alternativas consideradas:**
- Trocar por `<dialog>` nativo → rejeitado agora: exigiria reescrever CSS e os 9 pontos de abertura/fechamento.
- Chamar `openModal()/closeModal()` em cada ponto → mais invasivo e fácil de esquecer um.

**Por que essa:** cobre os 9 pontos existentes e qualquer futuro que use `style.display`.

**Impacto:** quando FR-032 migrar para módulos, vale reavaliar `<dialog>`.

---

## D001-004 — "Madrugador" sem mudança de banco

**Decisão:** Ler `watch_history.watched_at` (já existia) e calcular a conquista no cliente.

**Alternativas consideradas:**
- Nova coluna/flag → desnecessário.

**Por que essa:** zero migração; vale também para itens marcados antes desta mudança.

**Regra:** madrugada = 0h às 4h59 no horário local do navegador.

---

## D001-005 — Rotten Tomatoes por busca com título original

**Decisão:** Link de busca `rottentomatoes.com/search?search=<original_title>`.

**Por que essa:** o RT não tem ID público no TMDB; o título original (geralmente em inglês) é o que o site reconhece. IMDb usa `imdb_id` (filmes) ou `external_ids` (séries) e fica oculto quando não existe.

---

## D001-006 — Item 37 substituído

**Decisão:** O item original ("`.gitignore` ignora `index.html`") era um erro de leitura do assistente; substituído por: versionar `package-lock.json` e ignorar `.claude/settings.local.json`.

**Por que essa:** confirmado com `git check-ignore -v`; usuário pediu "o mais recomendado".

---

## D001-040 — Séries: "Já Vi" marca tudo, "Vi até aqui" no lugar de "Marcar série"

**Decisão:** em série e dorama, "Já Vi" fica sempre ativo e marca todas as temporadas de uma vez (um pedido só, com upsert que ignora repetidos). O botão "Marcar série" saiu e cada episódio ganhou "Vi até aqui" (marca ele e todos os anteriores). O convidado acompanha episódios igual à conta, guardados no aparelho (`guest_episodes`, via `src/app/episodeStore.js`), e esses episódios vão para a conta na mesma pergunta de importação do histórico.

**Alternativas consideradas:**
- Manter "Já Vi" travado até marcar todos os episódios → era o bug: o "Como foi?" nunca aparecia.
- Manter "Marcar série" ao lado do "Já Vi" → redundante; recomendado tirar e aprovado pelo usuário ("sim").
- Esconder episódios do convidado → o usuário pediu que o convidado se comporte igual à conta.

**Por que essa:** pedidos do usuário em 2026-11-06 (T001-115 a T001-118).

**Impacto:** service worker `v24`; `episodeStore.js` entrou no cache; testes em `tests/e2e/series.spec.js`. Publicado em `c60db74` + `0b7bdba`.

---

## D001-039 — Extras: batalha em mata-mata, efeito 3D sem biblioteca

**Decisão:** Pedido do usuário em 2026-11-06: todos os extras, menos listas personalizadas, com SQL liberado (nenhum precisou). A Cine-batalha é um mata-mata de 8 títulos, sem pontuação ELO guardada: serve para escolher o que ver agora, e o gosto já é aprendido pelo DNA. O efeito 3D é código próprio (cerca de 60 linhas), não o vanilla-tilt.js. Lançamentos de filme são o que chegou ao digital no Brasil, não ao cinema.

**Por que essa:** ELO precisaria de muitas batalhas e de um lugar para guardar a pontuação, e repetiria o DNA. Uma biblioteca traria código de terceiros para um efeito que o CSS faz com 4 variáveis. Para quem escolhe o que ver em casa, a estreia que importa é a que dá para ver em casa.

**Alternativas consideradas:** batalha com ELO por gênero → rejeitada pelos motivos acima. `/movie/now_playing` → rejeitado: filmes em cartaz no cinema, que não dá para ver pelo app.

---

## D001-038 — Reação na linha do histórico, mudada só por função

**Decisão:** A reação é uma coluna `reaction` em `watch_history` (só 'fire', 'sad', 'laugh', 'mind'), mudada pela função `set_title_reaction` (SECURITY DEFINER, só nas linhas de `auth.uid()`). O `get_friend_profile` já devolve a coluna. "Já vi" deixa o título aberto para a pessoa reagir na hora.

**Por que essa:** uma reação só existe para título assistido e some junto com ele; não precisa de tabela nova nem de outra consulta para os amigos. O histórico não tem política de UPDATE, e liberar UPDATE deixaria mudar título e data; a função muda só a reação.

**Alternativas consideradas:** tabela `title_reactions` → rejeitada: mais uma tabela, RLS e junção, para guardar um campo por título. Fechar o título depois de "Já vi", como antes → rejeitado: ninguém voltaria ao título só para reagir.

---

## D001-037 — Indicações pelo DNA: rodízio pelos gêneros que pesam

**Decisão:** Com 5+ títulos com gênero, cada cartão busca no /discover um gênero favorito, com os mesmos filtros de qualidade, sem o que a pessoa já viu. O gênero do dia se reveza entre até 3 favoritos que pesem pelo menos metade do primeiro. Em série e dorama, os gêneros de filme viram os de série (Ação+Aventura somam em "Ação e aventura"); os que não existem em série são pulados. Sem gênero que sirva, ou sem resultado, aquele cartão fica com a indicação de todo mundo.

**Por que essa:** aprovado pelo usuário em 2026-11-06 ("pode continuar assim"), inclusive usar os gêneros de filmes para série e dorama de quem só vê filmes. O corte de metade do peso veio do teste com o TMDB real.

**Alternativas consideradas:** DNA por tipo (série só pelo que viu de série) → rejeitada: quem nunca viu série ficaria sempre no padrão. Rodízio igual entre os 3 primeiros → rejeitado: gênero com peso pequeno aparecia um dia sim, um não.

---

## D001-036 — Compatibilidade pela interseção dos gêneros

**Decisão:** A compatibilidade é a soma, gênero a gênero, da menor fatia entre os dois (cada título vale 1, dividido entre os seus gêneros, como no DNA). 100% = mesma mistura de gêneros; 0% = nenhum gênero em comum. Títulos vistos pelos dois aparecem à parte, sem entrar na conta. Só aparece com pelo menos 3 títulos com gênero de cada lado.

**Por que essa:** o número tem leitura direta ("58% do que cada um assiste cai nos mesmos gêneros"), é igual para os dois amigos e reaproveita o DNA. Títulos em comum quase sempre são poucos e puxariam a nota para baixo sem dizer muito.

**Alternativas consideradas:** semelhança de cosseno → rejeitada: dá números altos para quase todo mundo (Drama e Comédia estão em todo histórico) e é difícil de explicar. Contar títulos em comum → rejeitada: com históricos de tamanhos diferentes, quase sempre perto de 0%.

---

## D001-035 — "Outros" do DNA sem barra, com os nomes

**Decisão:** A linha "Outros" do DNA não tem barra: fica separada por um fio, em cor secundária, com a porcentagem e os gêneros que entraram nela, na ordem do ranking. Até 6 nomes aparecem inteiros; com 7 ou mais, os 5 primeiros e "e mais N" ("e mais 1" nunca aparece: o nome ocupa o mesmo espaço).

**Por que essa:** com poucos títulos, "Outros" passava da barra do 1º gênero (28% contra 25% no exemplo real) e parecia o destaque. Recomendado pelo assistente e aprovado pelo usuário em 2026-11-05 ("pode fazer esse ajuste").

**Alternativas consideradas:** mostrar 6 ou 7 gêneros → rejeitado: com poucos títulos sobram muitos gêneros pequenos e a lista só fica mais comprida. Tirar "Outros" → rejeitado: as porcentagens deixariam de somar 100.

---

## D001-034 — Horas assistidas e ator mais visto com detalhes guardados no aparelho

**Decisão:** Para cada título visto (e cada série com episódios marcados) o app busca uma vez `/movie|tv/{id}?append_to_response=credits`, 4 pedidos por vez, e guarda um resumo pequeno em `localStorage` (`title_facts`): duração, episódios, duração do episódio e os 5 primeiros do elenco. Filmes não expiram; séries, em 30 dias (episódios novos). Horas: filme pela duração; série no histórico inteira, a não ser que tenha episódios marcados; série só em andamento conta os episódios marcados. A duração do episódio é a média de `episode_run_time` ou, sem ela, a do último episódio, com teto de 70 min. Ator mais visto: quem aparece em mais títulos vistos (no mínimo 2; empate por nome); séries só em andamento não contam. O número diz "aprox." e, se faltar algum título, "com X de Y títulos". Sem TMDB, mostra "—" e "Sem conexão com o TMDB" em vez de um número errado.

**Por que essa:** escolha do usuário em 2026-11-05 (parte 2 separada). Guardar no aparelho evita repetir dezenas de pedidos a cada abertura do perfil: no Chrome, a primeira abertura com 7 títulos levou 1,4 s e a segunda não fez nenhum pedido. Nada vai para o banco.

**Teto de 70 min:** com o TMDB real, Stranger Things não tem média e o último episódio tem 129 min. Com teto de 90 min a série sozinha dava 63 h (perto de 50 h na vida real); com 70 min, 49 h. Doramas costumam ter de 60 a 70 min por episódio e continuam certos.

**Privacidade:** as chaves de `title_facts` dizem quais títulos a conta viu; por isso são apagadas ao sair da conta e ao deletá-la, e uma busca que ainda estava rodando não grava mais nada depois disso. O convidado mantém, como já mantém a própria biblioteca no aparelho.

**Alternativas consideradas:** guardar no banco → rejeitado: precisaria de SQL e não ajuda quem é convidado. Somar o elenco de todos os episódios (`aggregate_credits`) → rejeitado: pedido pesado e fora das rotas do proxy. Buscar a duração de cada temporada → rejeitado: um pedido por temporada.

---

## D001-033 — DNA do usuário só com o histórico salvo, em duas partes

**Decisão:** A primeira parte (T001-098) usa só o que `watch_history` já guarda: gêneros, tipo, ano e data. Cada título vale 1, dividido igualmente entre os seus gêneros, e as porcentagens são arredondadas para somar 100 (maior resto). Gêneros de série que juntam dois de filme contam como os de filme ("Ação e aventura" → Ação e Aventura; "Ficção e fantasia" → Ficção científica e Fantasia; "Guerra e política" → Guerra; "Infantil" → Família). Mostra os 5 primeiros e junta o resto em "Outros". Com menos de 5 títulos com gênero, avisa que o DNA "ainda está se formando". Horas assistidas e ator mais visto ficam para a parte 2 (T001-099), que precisa buscar detalhes no TMDB.

**Por que essa:** escolha do usuário em 2026-11-05 ("Em 2 partes"). Abre na hora, funciona offline e não precisa de SQL. Dividir o peso evita que um título com cinco gêneros pese cinco vezes mais.

**Alternativas consideradas:** contar cada gênero uma vez por título (as porcentagens passariam de 100) → rejeitado. Gráfico de pizza ou barra empilhada com uma cor por gênero → rejeitado: barras horizontais numa cor só, com nome e número escritos, leem melhor no celular e não dependem de cor. Tudo de uma vez, já com horas e ator → adiado pelo usuário.

**Plural:** `Intl.PluralRules('pt-BR')` trata 0 como singular ("0 título"); nos meses sem nada o texto é "nenhum título".

---

## D001-032 — Indicações do dia em painel flutuante, aberto sozinho uma vez por dia

**Decisão:** As indicações saem do topo de Descobrir e vão para um painel no canto inferior direito, aberto por um botão redondo (ideia do usuário, "como um chatbot de ajuda"). O painel abre sozinho só na primeira entrada do dia, 1,2 s depois de entrar, e nunca por cima de login, boas-vindas, título aberto ou link de título, Match ou amigo. Depois, só pelo botão. Uma bolinha rosa marca indicações ainda não vistas no dia. O painel não é modal: aberto sozinho, não tira o foco; aberto pelo botão, o foco vai para o fechar; Esc fecha e devolve o foco ao botão.

**Por que essa:** na tela, a seção ficava grande demais ou desproporcional, e empurrava a busca para baixo. Abrir toda vez que o app abre cansaria rápido, já que as indicações são as mesmas o dia inteiro.

**Alternativas consideradas:** abrir a cada visita → rejeitado pelo motivo acima. Botão no canto esquerdo → rejeitado: o direito é onde as pessoas esperam o "chat"; o "voltar ao topo" subiu para 96px.

**Testes:** a fixture marca as indicações como vistas hoje (opção `dailySeen`), para o pop-up não cobrir o que os outros testes clicam.

---

## D001-031 — Indicações do dia escolhidas pela data, sem servidor

**Decisão:** Um filme, uma série e um dorama por dia (pedido do usuário: "um de cada"). Cada um sai de um grupo fixo de títulos bem avaliados do TMDB, ordenado por número de votos: filmes com nota 7,3+ e 3.000+ votos (200 títulos), séries com 7,8+ e 800+ votos sem animação, reality e talk show (200), doramas coreanos com 7,8+ e 100+ votos (120). A data escolhe página e posição com passo 37, então o rodízio passa pelo grupo inteiro antes de repetir. A série pula coreanas, que ficam no cartão Dorama.

**Por que essa:** todo mundo vê as mesmas três no mesmo dia, sem tabela nem rotina no servidor. Ordenar por votos (e não por popularidade) quase não muda de um dia para o outro, então recarregar não troca a indicação. Conferido no TMDB real em 2026-11-03: os grupos têm 707, 336 e 194 títulos, mais que o necessário.

**Alternativas consideradas:** curadoria à mão → rejeitado: exigiria manter uma lista. Popularidade do dia → rejeitado: a ordem muda várias vezes por dia. Tirar o que a pessoa já assistiu → adiado: faria cada um ver indicações diferentes.

---

## D001-030 — Desafio do dia por rodízio, sem servidor

**Decisão:** Um desafio por dia, escolhido pela data (`dia × 7` dentro da lista), mais uma meta semanal fixa (assistir 3 títulos, segunda a domingo). O andamento fica em `progress.challenges`, junto com o XP: metadados da conta ou aparelho do convidado. Desafio do dia vale 25 XP; a meta, 50.

**Por que essa:** o passo 7 nunca repete o desafio de ontem e passa por todos (7 não divide 9 nem 10). A mesma data dá o mesmo desafio em todos os aparelhos da pessoa. Sem tabela nova, como o XP (D001-025).

**Alternativas consideradas:** 3 desafios por dia com bônus (ideia original em FUNCIONALIDADES.md) → adiado: um só é mais fácil de entender e cabe no perfil sem poluir. Sorteio aleatório → rejeitado: poderia repetir e daria desafios diferentes em cada aparelho.

**Limitação:** como o XP, a própria pessoa consegue alterar o andamento. Não importa enquanto não houver ranking (T001-094).

---

## D001-029 — Amigos no cabeçalho; privacidade no servidor

**Decisão:** Amigos abre por um botão ao lado do perfil, sem aba própria. Quem desliga o compartilhamento não tem histórico, lista e conquistas enviados nem para amigos: a regra está em `get_friend_profile`, não na tela.

**Por que essa:** amigos pertencem à conta; as abas ficam para as ações do momento. Esconder só na interface deixaria os dados acessíveis para quem chamasse a função diretamente.

**Padrão:** compartilhamento ligado, com aviso na própria tela.

---

## D001-028 — Amigos: busca só por username exato

**Decisão:** Encontrar alguém só pelo username exato; nunca por email nem por parte do nome. Convite de Match no app só entre amigos aceitos. Perfis seguem privados: funções expõem só id, username e nome.

**Alternativas consideradas:** busca por email → rejeitada: revelaria quem tem conta. Busca parcial → rejeitada: permitiria varrer os usuários.

**Impacto:** sem o SQL aplicado, as seções ficam ocultas e o Match por link continua funcionando.

---

## D001-027 — FR-035 em duas etapas

**Decisão:** O cliente só passa a usar o proxy depois de a função estar publicada com o segredo.

**Por que essa:** gravar segredo e publicar função exigem autorização do usuário nesta máquina. Trocar o cliente antes deixaria o site sem filmes. A chave atual continua no histórico do git, então deve ser trocada no TMDB.

---

## D001-026 — Match no mesmo celular antes do tempo real

**Decisão:** Duas pessoas votam passando o aparelho; sem sessão, link nem banco.

**Alternativas consideradas:** Supabase Realtime com link (spec 006) → adiado: exige tabelas novas. A versão local testa se a ideia agrada antes desse investimento.

---

## D001-025 — Progresso e plataformas nos metadados da conta

**Decisão:** Sequência, XP e plataformas ficam em `user_metadata`.

**Alternativas consideradas:** colunas novas em `profiles`/`user_preferences` → adiado: migração de banco. Metadados sincronizam entre aparelhos sem mudar o schema.

**Limitação:** a própria pessoa consegue alterar esses valores. Não importa sem ranking; um ranking futuro exigiria mover para tabela com regra no servidor.

---

## D001-024 — Minhas plataformas fica no aparelho

**Decisão:** Guardar em `localStorage`, inclusive para quem está logado.

**Alternativas consideradas:** coluna nova em `user_preferences` para sincronizar entre aparelhos → adiado: exige mudar o banco; dá para evoluir depois sem perder a tela.

**Impacto:** a escolha não acompanha a conta em outro aparelho, e a tela avisa isso.

---

## D001-023 — Migração com consentimento, sem levar contas

**Decisão:** Contas antigas não migram (eram locais, sem email): a pessoa cria uma conta e o app oferece trazer a lista. "Agora não" pergunta de novo em 7 dias. Os dados locais só saem depois de o banco confirmar; as senhas em texto puro saem em toda abertura, com ou sem importação. Vale o perfil em uso; sem ele, a soma dos perfis do navegador.

**Alternativas consideradas:** importar sozinho no login → rejeitado: o navegador pode ser compartilhado e a lista seria de outra pessoa.

**Limitação:** `localStorage` é por domínio, então só funciona se a versão nova for publicada no mesmo endereço da antiga.

---

## D001-022 — Apagar a conta só pelo servidor

**Decisão:** Edge Function `delete-account` remove o usuário de `auth.users`; o `ON DELETE CASCADE` leva o resto. O id vem do token validado. O cliente só informa sucesso com a confirmação do servidor.

**Alternativas consideradas:** criar regras de DELETE em `profiles` e demais tabelas → rejeitado: o login continuaria existindo e a pessoa poderia entrar de novo em uma conta vazia.

**Por que mudou:** o código antigo apagava só parte dos dados e dizia "sucesso" mesmo sem nenhuma linha removida, porque as tabelas não têm regra de DELETE e o Supabase não trata isso como erro. Substitui parcialmente D001-010 (autorizado pelo usuário em 2026-10-30).

---

## D001-021 — Dorama como grupo próprio na biblioteca

**Decisão:** Títulos com tipo `dorama` ganham o grupo "DORAMAS" e contam para a conquista Maratonista.

**Alternativas consideradas:** gravar dorama como `tv` → rejeitado: exigiria migrar o que já está salvo e perderia a distinção que o app oferece.

---

## D001-020 — Site abre por servidor local

**Decisão:** Sem etapa de build. `INICIAR_SITE.bat` (`npm start`) sobe o servidor e abre o navegador; aberto por `file://`, o site mostra um aviso com a instrução.

**Alternativas consideradas:** empacotar tudo em um script comum para o duplo clique voltar a funcionar → rejeitado: criaria build e um arquivo gerado a cada mudança; o service worker e o PWA também exigem servidor.

**Impacto:** o duplo clique no `index.html` deixa de funcionar (regressão de T001-037).

---

## D001-016 — Migração por script, com legacy arquivado

**Decisão:** `legacy/script.js` foi dividido por um script baseado no parser Babel, sem reescrita manual. Variáveis globais passaram a `session.*` (`src/state/appState.js`) respeitando escopo.

**Por que essa:** 2.862 linhas à mão arriscariam troca silenciosa de comportamento. O script falha se sobrar identificador sem origem ou escrita em import.

**Impacto:** `legacy/` saiu do projeto; a cópia fica em `../_arquivo-legacy/antes-modulos-2026-10-30/` (recuperável, como em D001-012).

---

## D001-017 — Conquistas: vale a lista que aparecia na tela

**Decisão:** `src/domain/badges.js` adotou as 12 conquistas do app em produção. As 4 que só existiam em `src/` e nunca apareceram (Lendário, Viciado na Roleta, Amante de Terror, Dorameiro) saíram, e os testes foram reescritos.

**Alternativas consideradas:** somar as duas listas → rejeitado: criaria conquistas novas e "Maratonista" tinha duas regras (25 títulos × 5 séries); a meta da feature é não mudar comportamento.

---

## D001-018 — Identidade "Sala escura"

**Decisão:** Base ameixa `#14101F`; âmbar `#FFC94D` (Filme), teal `#3DD6C6` (Série), rosa `#FF8FB8` (Dorama), sempre com texto escuro sobre o accent; Big Shoulders Display (títulos) + Hanken Grotesk (texto; a Atkinson Hyperlegible saiu a pedido do usuário porque o zero cortado parecia defeito); o bilhete recortado é o único elemento marcante.

**Alternativas consideradas:** manter preto com vermelho e trocar só a fonte → rejeitado: continuaria lembrando a Netflix, que era a queixa de FR-027.

**Impacto:** o vermelho de marca sai; resolve na prática a decisão pendente de D001-013 (texto escuro nos botões vale agora para os 3 temas). É decisão de gosto: o usuário pode pedir ajuste.

---

## D001-019 — URL: atualiza sem criar histórico

**Decisão:** `history.replaceState` a cada mudança; o título do link só abre depois do login/convidado.

**Alternativas consideradas:** `pushState` ao abrir título (Voltar fecha o modal) → adiado: mudaria o comportamento do botão Voltar e pede tratamento de foco próprio.

---

## D001-015 — `name` só nos campos de conta

**Decisão:** Login, cadastro e perfil têm `name`; busca, filtros e roleta ficam sem.

**Alternativas consideradas:**
- `name` em todos os campos → rejeitado: não há `<form>` nem envio, o valor é lido por `id`; nesses campos o atributo não teria efeito.

**Por que essa:** nos campos de conta o `name` ajuda gerenciadores de senha e o preenchimento automático.

---

## D001-014 — Confirmação para "limpar tudo", desfazer para item único

**Decisão:** As ações de limpar a lista inteira mantêm a confirmação (T001-023); as remoções de um item (✕) ganham "Desfazer" em vez de confirmação.

**Alternativas consideradas:**
- Confirmação + desfazer nas ações de limpar tudo → rejeitado: dupla proteção para a mesma ação.
- Confirmar cada ✕ → rejeitado: atrito alto para uma ação frequente e fácil de refazer.

**Como:** remoção adiada (a gravação só acontece depois do prazo), para que desfazer não precise reescrever dados no Supabase (D001-010).

---

## D001-013 — Accent separado para texto e para fundo, por tema

**Decisão:** Dois tokens novos por tema — `--accent-text` (accent usado como cor de texto) e `--accent-on` (cor do texto sobre o accent). Filme: `#ff4d55` / branco. Série e Dorama: a própria cor / `#111`.

**Alternativas consideradas:**
- Escurecer o dourado e o rosa até o branco passar (ex.: `#b45309`, `#db2777`) → rejeitado: muda a identidade dos temas (dourado vira marrom).
- Trocar o vermelho de marca `#e50914` → rejeitado: só o uso como texto falhava; como fundo com branco passa (4.79:1).

**Impacto:** botões/aba ativa nos temas Série e Dorama passam a ter texto escuro; hover do Filme escurece em vez de clarear. Relaciona-se com FR-027 (identidade visual).

---

## D001-011 — Network-first para os arquivos do app

**Decisão:** HTML/JS/CSS/manifest da própria origem usam network-first com fallback para cache; imagens e recursos externos seguem cache-first. Versão única `CACHE_VERSION` gera os nomes dos caches.

**Alternativas consideradas:**
- Só subir a versão do cache e manter cache-first → rejeitado: cada deploy dependeria de lembrar de trocar a versão; esquecer = usuário preso no JS antigo (foi o que aconteceu na 004).
- Stale-while-revalidate → rejeitado: a primeira abertura depois do deploy ainda mostraria a versão velha.

**Impacto:** uma requisição de rede a mais por arquivo do app quando online (arquivos pequenos, sem build); offline continua funcionando. Trocar `CACHE_VERSION` ainda é recomendado a cada deploy para limpar caches.

---

## D001-012 — Arquivos mortos movidos, não apagados

**Decisão:** `script.js.backup` e `script-migrations.js` foram para `E:\Trabalhos\O que assistir\_arquivo-legacy\`.

**Por que essa:** escolha do usuário; os arquivos não estão no git, então apagar seria irreversível.

---

## D001-010 — Nada no Supabase por enquanto

**Decisão:** Não alterar o Supabase (schema, dados, funções, Edge Functions) nesta fase.

**Por que essa:** decisão do usuário em 2026-10-28.

**Impacto:** FR-040 (migração `localStorage` → Supabase) e FR-035 (proxy da chave TMDB via Edge Function) ficam adiados. Mudanças só no cliente que *leem* o que já existe (ex.: `watched_at` na T001-009) continuam permitidas.

---

## D001-009 — Commit único ao final da feature

**Decisão:** Nenhum commit até todo o backlog da 008 estar finalizado.

**Por que essa:** decisão do usuário em 2026-10-28.

**Impacto:** o trabalho fica sem commit na branch `004-series-tracking` até o fim; o registro de progresso fica nos arquivos desta migration. Mensagem seguirá o padrão `{{type}}(008): ...`.

---

## D001-007 — Setas com ativação automática nas abas e no seletor de tipo

**Decisão:** Um único listener (`initRovingGroups`) para todo `[role=tablist]`/`[role=radiogroup]`: setas/Home/End movem o foco **e ativam** o item.

**Alternativas consideradas:**
- Deixar todos com `tabindex=0` (sem setas) → rejeitado: foge do padrão ARIA de abas/radio e enche a ordem do Tab.
- Ativação manual (setas só movem, Enter ativa) → rejeitado: trocar de aba/tipo é barato e o padrão de radio já ativa ao mover.

**Impacto:** cobre também as abas de login, sem código específico. Implementar FR-003 sem isso deixaria "Série", "Dorama" e "Roleta" inalcançáveis — por isso FR-004 foi feito junto.

---

## D001-008 — Card "Em Andamento": título como botão com área estendida

**Decisão:** O `<article>` deixa de ser clicável; o título vira `<button>` e um `::after` cobre o card. "Episódios" fica acima (`z-index: 1`).

**Alternativas consideradas:**
- Card inteiro como `<button>` → rejeitado: teria outro botão ("Episódios") dentro, o que é HTML inválido.

**Impacto:** clique em qualquer parte do card continua abrindo os detalhes (verificado com mouse real).

## D001-041 — Listas personalizadas em 2 partes, independentes das outras listas

**Decisão:** pedido do usuário em 2026-11-06, escolhendo as recomendações. Parte 1: criar, renomear e apagar listas, emoji, "Salvar em uma lista" no título e a aba "Minhas Listas". Parte 2 (depois): ordem arrastando e link público. O convidado também tem listas, no aparelho, levadas para a conta na pergunta de importação. Um título pode estar em várias listas, e entrar numa lista não mexe em "Quero Assistir" nem em "Já assistidos". O emoji é escolhido entre 16 fixos (o app não aceita texto livre ali). Nome único por pessoa, sem diferenciar maiúsculas; na importação, a lista do convidado com o nome de uma que a conta já tem junta os títulos nela.

**Alternativas consideradas:**
- Tudo de uma vez → maior e mais demorado; dividido como o DNA.
- Só com conta → o resto do app funciona para convidado.
- Salvar numa lista também pôr em "Quero Assistir" → misturaria as duas coisas.

**Complemento (T001-121):** o usuário pediu pré-listas e escolheu os dois tipos: modelos vazios com um toque e coleções prontas com títulos. As coleções não ficam guardadas no banco: são buscas fixas no TMDB (mais bem avaliados do tema), e só a cópia vira lista da pessoa. Criar listas sozinhas em toda conta nova foi descartado (encheria a aba de quem não quer).

## D001-042 — Redesign geral da UX/UI em 5 etapas, publicado só no fim

**Decisão:** pedido do usuário em 2026-11-06 ("mudar o layout ux e ui do site e deixar algo mais profissional"), a partir de 3 varreduras no Dribbble e de um brainstorming com o Gemini. Ordem aprovada:
1. Base: ícones Phosphor no lugar de emojis e SVGs à mão, linha única do título, toques de app, pôsteres padronizados. ✅ (T001-124)
2. Página do título: fundo com a cor do pôster, ações em ícones que acendem (estilo Letterboxd/Reelmark), abas, "Parecidos", esqueletos. ✅ (T001-125)
3. Navegação: barra flutuante embaixo com Sortear no centro, biblioteca em grade de pôsteres, "Continue assistindo" e indicações no início.
4. Filtros em pílulas com logos dos serviços (no lugar dos 6 `<select>`), busca junto dos filtros.
5. Gavetas que sobem de baixo no lugar das janelas, sorteio animado com vibração, Match com cartão de arrastar e tela "Deu Match!", reações ilustradas (6, com "Não curti" e "Dormi no meio": muda o CHECK de `watch_history.reaction` em `database/reactions.sql`), DNA como "Perfil de gosto". Primeira visita com perguntas de serviços e gêneros e "Pular".

Regras combinadas: cada etapa numa branch `redesign/etapa-N`, com commit e envio ao GitHub; **nada vai para `main`/`004-series-tracking`/produção até as 5 etapas estarem prontas**; **antes das etapas 3, 4 e 5, fazer a captação de referências no Dribbble** (uma página por vez, com pausas: a conta do usuário levou bloqueio temporário por excesso de buscas). Ícones: Phosphor (traço, preenchido e duotone) e reações como selos ilustrados próprios (gerados no Gemini, revisados e aprovados pelo usuário antes de usar). As prévias da Vercel não carregam títulos (o proxy do TMDB só aceita o domínio oficial e localhost) e o usuário decidiu não liberar.

**Referências escolhidas (Dribbble):** Reelmark/Callour Studio (27212048), Movie discovery app/Yaroslav H. (26894339), PrimeVision/Bato (26628290), Letterboxd redesenhado/Matthew Buchanan, AstraFlix/Kites Design (26872729), UIGREAT (fundo na cor do pôster), barras em pílula (Onix, strangehelix), "Deu Match!" (Artur Lopato), reações em selos (Tatiana O'Toole).

**Alternativas consideradas:**
- Publicar cada etapa → o app ficaria "meio reformado" por um tempo; o usuário preferiu tudo junto.
- Lucide em vez de Phosphor → menos variações de peso (sem duotone/preenchido para estados ativos).
- Abas que escondem as partes do título → quem só rola perderia conteúdo e vários testes teriam de mudar; ficaram abas que levam até a parte.

## D001-043 — "Nos cinemas" pelo calendário do Brasil, com limite de 75 dias

**Decisão:** pedido do usuário em 2026-11-07. Filme sem streaming no Brasil mostra, no "Onde assistir", "Estreia nos cinemas em DD/MM" (estreia futura) ou "Nos cinemas" (em cartaz). Fonte: `release_dates` do TMDB, país BR, tipo 3 (cinema) ou, sem ele, tipo 2 (limitado). O TMDB não diz quando um filme sai de cartaz, então "em cartaz" = estreou há no máximo 75 dias **e** nenhum lançamento digital (4), físico (5) ou na TV (6) no Brasil com data até hoje. Data em outro ano leva o ano (DD/MM/AAAA). Sem dados do Brasil, nada muda.

**Por quê:** a janela entre cinema e streaming no Brasil costuma ficar entre 45 e 90 dias; 75 dias evita dizer "nos cinemas" para filmes que já saíram, e a data digital, quando existe, corta antes. Ajustável em `IN_THEATERS_DAYS` (`src/domain/cinemaRelease.js`) se o usuário preferir outro prazo.

## D001-044 — Ingresso: imagem do topo em cadeia, sem fontes de fora do TMDB

**Decisão:** pedido do usuário em 2026-11-07, ao ver o ingresso novo (T001-127). O topo usa, nesta ordem: imagem de paisagem (da lista ou dos detalhes) → pôster inteiro ao lado do título (nunca cortado, para não aparecer só o letreiro) → cena de episódio da 1ª temporada (série e dorama) → mosaico com fotos do elenco → topo menor com o ícone do tipo.

**Por quê:** o app já tira os títulos sem pôster do sorteio, da roleta, do Match, da batalha, das indicações, das coleções e dos "Parecidos"; o caso sem imagem fica para a busca e links diretos. Tudo na cadeia usa dados que o app já carrega e caminhos que o proxy já libera.

**Alternativas consideradas:**
- Galeria `/images` do TMDB (pôsteres sem letreiro) → exigiria liberar e publicar o proxy de novo, que é o mesmo da produção; ficou para depois.
- Wikipédia, OMDb ou Fanart.tv → mais uma fonte e regra de segurança (as duas últimas com chave) para um caso raro.
- Cortar o pôster no topo → mostrava o letreiro em inglês de alguns pôsteres.

## D001-045 — Etapa 3: barra de baixo no celular, Biblioteca própria e Início com o sorteio em primeiro

**Decisão:** escolhas do usuário em 2026-11-07, depois da captação no Dribbble.
- Celular: barra flutuante com Início · Roleta · Sortear (centro) · Match · Biblioteca; perfil e amigos ficam no topo. No computador, sem barra: as abas do topo ganham a Biblioteca.
- O nome aparece embaixo de todos os ícones (e não só no ativo, como aprovado no começo): com o nome só no ativo, o Sortear saía do centro quando a Biblioteca estava aberta.
- Início: "Continue assistindo" compacto no alto; o sorteio logo depois, na primeira tela; Indicações do dia como último tópico (o usuário achou que no alto, e depois no meio, elas tiravam o lugar do sorteio e ficavam desproporcionais). O botão ✨ e o painel flutuante saíram.
- Top 10, Lançamentos e busca em 5 por linha no computador e 2 no celular (com 3, o 10º ficava sozinho).

**Alternativas consideradas:**
- Início · Biblioteca · Sortear · Amigos · Perfil na barra (Roleta e Match como cartões no Início) → o usuário preferiu manter Roleta e Match na barra.
- Indicações no alto em faixa compacta, ou de volta ao botão ✨ → preferiu no fim.
- Top 10 rolando para o lado no celular → a mesma área mostra a busca; fica para a etapa 4, quando a busca for para junto dos filtros.
