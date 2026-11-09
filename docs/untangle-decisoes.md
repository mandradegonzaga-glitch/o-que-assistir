# Refatoração untangle: registro de decisões (rodada final)

Branch `refactor/untangle`. Rodada final de revisão em 2026-11-09, com 3 revisores (src/app em duas partes;
domain/ui/api/state/utils/sw/scripts). Cada correção vem acima dos problemas que resolve.
Status: [ ] a fazer · [x] feito · [-] descartado (com o motivo).

## 1. Código morto
- [x] `domain/history.js` não era morto: o app refazia as mesmas regras à mão. `sorteioHistory` passou a usar
      `createSorteioEntry`/`deduplicateHistory`/`trimHistory`; `salvarHistorico` usa `createWatchedEntry` (que ganhou `watchedAt`).
- [x] Apagados `isBadgeEarned`, `isSeriesCompleted`, `storage.getRaw/setRaw`, `matchHistory.endpoint`, `ticket.withBusy`.
      `sliceAtPointer` foi para o teste (é a conferência independente da roleta).
- [-] `clearTmdbCache` fica: é o que isola os testes do cache.

## 2. Gêneros e tipos de mídia: uma tabela só
- [x] Mapa filme↔série único em `domain/genres.js` (com a lista de gêneros de série); o mesmo para "ids ou objetos {id}".
  - `tasteDna.js:7`, `surprise.js:14`, `dailyPicks.js:18-20` têm três cópias, que já divergem (10762→10751 só no DNA).
  - `genreIdsOf` reescrito em genres, tasteDna, titleFacts, blind, challenges.
- [x] Rótulos, cores e regra de dorama por tipo em `domain/mediaItem.js` (`MEDIA_KIND`, `DORAMA_PARAMS`, `isKorean`, `isSeriesType`).
      A cor de cada tipo agora é testada contra o tema no CSS.
  - "dorama = série KR sem animação" em filters, collections, dailyPicks, titleShare; `collections.js:24` refaz getTmdbEndpoint.
  - Nomes Filmes/Séries/Doramas em `app/filters.js:33`, `collections.js:21`, `blindSession.js:14`, `discover.js:298`, `titleShare` KIND_LABEL/TICKET_COLORS.
  - `isSeriesType` repetido com variações em library, lifeStats, episodes.
- [x] Regex de `poster_path` única (`isPosterPath`) (titleShare.js:47, userLists.js:11).

## 3. Busca no TMDB: um construtor e um jeito de sortear
- [x] `buildDiscoverUrl` → `discoverRequest(type, filtros)` devolve `{ path, params }` e recebe só o tipo do app; chamadores usam `tmdbGet`.
  - Concatena string com BASE_URL por fora de `buildTmdbUrl`; chamadores colam `&page=`.
  - Surpreenda-me (`discover.js:124-130`) monta URL à mão; `SURPRISE_QUALITY` usa chaves do TMDB no domínio.
- [x] Um `fetchRandomPage(request, { min, keep })` + `utils/shuffle` para sorteio, Match, Batalha e surpresa.
      e2e novo prova a divergência do Match (falha no código antigo).
  - `match.js:66-68` não volta à página 1 (filtros estreitos dão "Poucos títulos" e o sorteio funciona) — divergência real.
  - `battle.js:160-177` laço próprio; `domain/match.js` embaralha com sort.
- [x] Detalhes do título por uma função só na api (`titleDetails(type, id)`); e2e prova 1 pedido por filme aberto.
  - Filme aberto faz 2 pedidos (`titleModal.js:38` e `fetchDetails`); `ticket.js` copia os parâmetros para acertar o cache;
    `/${endpoint}/${id}` repetido em discover, match, matchHistory.
- [x] `media_type` normalizado quando o item entra (`pickDraw`, `abrirModal`); `withDetails` sem o parâmetro `endpoint`.
      O ingresso continua com `titleKind` (precisa distinguir dorama pelo país, que é outra regra).

## 4. Gravação conta/convidado: um store por coleção
- [x] Episódios ↔ biblioteca: uma `syncSeriesStatus`; `renderSeriesStatus` só desenha (abrir o título não grava mais).
      Desmarcar temporada/série: um pedido só (`unmarkSeason`, `clearSeries`), e falha não apaga o estado local.
      Botão "Já Vi" num lugar só (`setSeenButton`).
  - `updateSeriesWatchButton` grava histórico e tira da watchlist ao abrir o título.
  - Regras espalhadas em episodes.js e `titleModal.marcarVistoAtual`; `inWatchlist`/`inHistory` refeitos à mão.
  - Desmarcar faz um pedido por episódio e ignora falha; existe `clearSeries`.
- [x] `library:changed`: a ação da pessoa avisa uma vez, no fim; stores e auxiliares não avisam.
- [x] `listStore.js` no molde do libraryStore (create/rename/delete/setTitleInList/addTitlesToList/saveListOrder/changeList);
      limite de listas num lugar só (`canCreateList`); listShare usa `changeList`.
- [x] (parcial) Reações gravam pelo `libraryStore.setReaction`; "não tenho interesse" deixa de engolir falha do banco
      (e2e novo); sorteios chegam da api já no formato do app e `useSorteioHistory` define lista e índice.
- [-] Store separado para roleta e lista do Match: cada um tem uma gravação só, num lugar só; não compensa.
  - Três políticas diferentes de falha; reactions passa por cima do libraryStore.
  - Conversão de linha do banco (`tmdb_id→id`) repetida em supabase.js, userLists, auth → um `fromRow`.
- [x] Formato completo da sessão em `appState.js` (watchlist, lists, episodes sem `seasonData` morto, `EMPTY_PROGRESS`).

## 5. Filtros: um dono
- [ ] `app/filters.js` com `getFilters()/setFilter()` (pessoa incluída), emite uma vez; URL, pílulas e provedores escutam.
  - Patch de `select.value` no chipFilters + `setTimeout(0)`; ordem obrigatória em main.js; `rememberProviderValue`.
  - `urlState.js:37-38` escreve `natal`/`minhas` na regex.

## 6. Modais
- [ ] `openModal(id)/closeModal(id)` em ui/modals.js; `getActiveModal()` em vez de ler `style.display`.
  - 24 `style.display='flex'`; match.js detecta modal por `[style*="flex"]`; help.js `queueMicrotask`.

## 7. Menores
- [ ] `whileBusy` em vez de `disabled` à mão (discover, match).
- [x] Botão "Já Vi" desenhado num lugar só (feito junto com o grupo 4).
- [ ] localStorage direto → `storage`; preferências `last_*` gravadas só em `rememberPreferences`; MODES/TABS de uma fonte.
- [ ] drawReveal espera com `afterAnimations` e importa `TICKET_ICON`.
- [ ] Limites do Match (`NAME_LIMIT`, `MAX_TITLES`) exportados; `.limit(50)` → `MAX_SORTEIO_HISTORY`.
- [ ] Erros de amigos logados, silenciosos só para `PG.NO_TABLE`.
- [ ] Validação de senha (`passwordError`), nome a mostrar, cartão de conquista: uma função cada.
- [ ] Visibilidade de `#daily-row` numa função; regra do convite de Match fora do main.js; `closeLive` ao receber `done/bye`.
- [ ] badges da conta: guardar conquistas já ganhas na sessão (2 pedidos por conquista a cada ação).

## Observações
- 2026-11-09: em rodadas repetidas sob carga, 2 falhas em 396 em share.spec ("Gerando…" e "Enviado para Bia!"),
  contra 0 em 396 no commit 8c5fe7d. Isoladas, passam sempre. Verificar na rodada final se é instabilidade de toast.
