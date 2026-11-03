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
