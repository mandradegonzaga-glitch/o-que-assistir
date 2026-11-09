# Refatoração untangle: registro de decisões (rodada final)

Branch `refactor/untangle`. Rodada final de revisão em 2026-11-09, com 3 revisores (src/app em duas partes;
domain/ui/api/state/utils/sw/scripts). Cada correção vem acima dos problemas que resolve.
Status: [ ] a fazer · [x] feito · [-] descartado (com o motivo).

## 1. Código morto
- [ ] Apagar o que só os testes usam: `domain/history.js` inteiro, `isBadgeEarned`, `sliceAtPointer`,
      `isSeriesCompleted`, `clearTmdbCache`, `storage.getRaw/setRaw`, wrappers `matchHistory.endpoint` e `ticket.withBusy`.
      Testes passam a usar `computeBadgeStatuses` / `computeSpinRotation`.

## 2. Gêneros e tipos de mídia: uma tabela só
- [ ] Mapa filme↔série único em `domain/genres.js` (com a lista de gêneros de série); o mesmo para "ids ou objetos {id}".
  - `tasteDna.js:7`, `surprise.js:14`, `dailyPicks.js:18-20` têm três cópias, que já divergem (10762→10751 só no DNA).
  - `genreIdsOf` reescrito em genres, tasteDna, titleFacts, blind, challenges.
- [ ] Rótulos, cores e regra de dorama por tipo em `domain/mediaItem.js`.
  - "dorama = série KR sem animação" em filters, collections, dailyPicks, titleShare; `collections.js:24` refaz getTmdbEndpoint.
  - Nomes Filmes/Séries/Doramas em `app/filters.js:33`, `collections.js:21`, `blindSession.js:14`, `discover.js:298`, `titleShare` KIND_LABEL/TICKET_COLORS.
  - `isSeriesType` repetido com variações em library, lifeStats, episodes.
- [ ] Regex de `poster_path` única (titleShare.js:47, userLists.js:11).

## 3. Busca no TMDB: um construtor e um jeito de sortear
- [ ] `buildDiscoverUrl` devolve `{ path, params }` e recebe só o tipo do app; chamadores usam `tmdbGet`.
  - Concatena string com BASE_URL por fora de `buildTmdbUrl`; chamadores colam `&page=`.
  - Surpreenda-me (`discover.js:124-130`) monta URL à mão; `SURPRISE_QUALITY` usa chaves do TMDB no domínio.
- [ ] Um `fetchRandomPage` + `eligible()` + `shuffle()` para sorteio, Match e Batalha.
  - `match.js:66-68` não volta à página 1 (filtros estreitos dão "Poucos títulos" e o sorteio funciona) — divergência real.
  - `battle.js:160-177` laço próprio; `domain/match.js` embaralha com sort.
- [ ] Detalhes do título por uma função só na api (`titleDetails(type, id)`).
  - Filme aberto faz 2 pedidos (`titleModal.js:38` e `fetchDetails`); `ticket.js` copia os parâmetros para acertar o cache;
    `/${endpoint}/${id}` repetido em discover, match, matchHistory.
- [ ] `media_type` normalizado quando o item entra; `withDetails` sem o parâmetro `endpoint`.

## 4. Gravação conta/convidado: um store por coleção
- [ ] Episódios ↔ biblioteca: uma `syncSeriesStatus` no store; o botão "Já Vi" só desenha.
  - `updateSeriesWatchButton` grava histórico e tira da watchlist ao abrir o título.
  - Regras espalhadas em episodes.js e `titleModal.marcarVistoAtual`; `inWatchlist`/`inHistory` refeitos à mão.
  - Desmarcar faz um pedido por episódio e ignora falha; existe `clearSeries`.
- [ ] `library:changed`: o store avisa depois de gravar; ninguém mais.
- [ ] `listStore.js` no molde do libraryStore (create/rename/delete/setItem/reorder); listShare usa o store.
- [ ] Stores para sorteios, blacklist, roleta, matchHistory, reações; cada um com `load()`; auth só chama.
  - Três políticas diferentes de falha; reactions passa por cima do libraryStore.
  - Conversão de linha do banco (`tmdb_id→id`) repetida em supabase.js, userLists, auth → um `fromRow`.
- [ ] Formato completo da sessão em `appState.js` (watchlist, lists, episodes sem `seasonData` morto, `EMPTY_PROGRESS`).

## 5. Filtros: um dono
- [ ] `app/filters.js` com `getFilters()/setFilter()` (pessoa incluída), emite uma vez; URL, pílulas e provedores escutam.
  - Patch de `select.value` no chipFilters + `setTimeout(0)`; ordem obrigatória em main.js; `rememberProviderValue`.
  - `urlState.js:37-38` escreve `natal`/`minhas` na regex.

## 6. Modais
- [ ] `openModal(id)/closeModal(id)` em ui/modals.js; `getActiveModal()` em vez de ler `style.display`.
  - 24 `style.display='flex'`; match.js detecta modal por `[style*="flex"]`; help.js `queueMicrotask`.

## 7. Menores
- [ ] `whileBusy` em vez de `disabled` à mão (discover, match).
- [ ] Botão "Já Vi" desenhado num lugar só (titleModal + episodes, CHECK_ICON duplicado).
- [ ] localStorage direto → `storage`; preferências `last_*` gravadas só em `rememberPreferences`; MODES/TABS de uma fonte.
- [ ] drawReveal espera com `afterAnimations` e importa `TICKET_ICON`.
- [ ] Limites do Match (`NAME_LIMIT`, `MAX_TITLES`) exportados; `.limit(50)` → `MAX_SORTEIO_HISTORY`.
- [ ] Erros de amigos logados, silenciosos só para `PG.NO_TABLE`.
- [ ] Validação de senha (`passwordError`), nome a mostrar, cartão de conquista: uma função cada.
- [ ] Visibilidade de `#daily-row` numa função; regra do convite de Match fora do main.js; `closeLive` ao receber `done/bye`.
- [ ] badges da conta: guardar conquistas já ganhas na sessão (2 pedidos por conquista a cada ação).
