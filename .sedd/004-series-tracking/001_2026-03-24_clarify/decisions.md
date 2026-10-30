# Decisions — Migration 001

**Feature:** 004-series-tracking
**Migration:** 001
**Date:** 2026-03-24

---

## D001 — Nova tabela `episode_progress` (não alterar `watch_history`)

**Decisão:** Criar `episode_progress` como tabela separada.

**Alternativas consideradas:**
- Adicionar colunas `season`/`episode` em `watch_history` → rejeitado: quebraria rows existentes, misturaria granularidades diferentes (filme vs episódio).
- Usar JSON column em `watch_history` → rejeitado: dificulta queries, impossibilita índices por episódio.

**Por que essa:**
`watch_history` registra "o usuário assistiu X". `episode_progress` registra "o usuário marcou episódio Y de X como visto". São semânticas distintas. UNIQUE constraint por `(user_id, series_id, season_number, episode_number)` garante idempotência.

**Impacto:** Zero downtime, zero migração de dados.

---

## D002 — Cache de temporada com TTL de 1 hora (não 5 minutos)

**Decisão:** `fetchSeasonDetails()` usa TTL de 3600000ms (1h).

**Por que:**
- Estrutura de temporada muda raramente (novos eps semanais, no máximo).
- Cache de 5min causaria 12 chamadas/hora por série em andamento — inaceitável.
- 1h reduz isso para 1 chamada/hora.

**Risco aceito:** Novo episódio lançado pode demorar até 1h para aparecer no app. Aceitável para esse MVP.

---

## D003 — Lazy loading via `requestIdleCallback` com fallback `setTimeout`

**Decisão:** O widget Up Next só é carregado após o thread principal estar ocioso.

```js
const loadUpNext = () => { /* fetch + render */ };
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadUpNext, { timeout: 2000 });
} else {
  setTimeout(loadUpNext, 500);
}
```

**Por que:**
- Widget pode disparar 10-20 chamadas API em paralelo (uma por série em progresso).
- Se síncrono no load: bloqueia TTI (Time to Interactive) e pode ratelimitar TMDB.
- `requestIdleCallback` garante que sorteio (funcionalidade core) carrega primeiro.

---

## D004 — Filtrar Season 0 no nível da API (`tmdbSeries.js`)

**Decisão:** `fetchSeasonDetails()` nunca retorna Season 0.

**Por que:**
- TMDB agrupa especiais/OVAs/extras em Season 0. São conteúdos opcionais.
- Incluir Season 0 na lógica de "série completada" causaria falsos negativos.
- Filtrar na camada de domínio seria redundante em cada chamador.

**Tradeoff:** Usuário não pode marcar especiais como assistidos neste MVP. Aceitável.

---

## D005 — Sem migração de dados históricos de TV em `watch_history`

**Decisão:** Entradas TV já salvas em `watch_history` não são convertidas para `episode_progress`.

**Por que:**
- Não há informação de episódio nas entradas antigas — impossível migrar sem perda.
- Série marcada em `watch_history` ≠ série com progresso rastreado.
- Complexidade de migração muito alta vs. benefício (usuário começa fresh no tracking).

**Impacto:** Séries antigas no histórico não aparecem no Up Next. Usuário precisa marcar episódios manualmente a partir de agora. Comunicado via UI ("Novo: rastreamento de episódios — marque para continuar").

---

## D006 — Máximo 3 chamadas síncronas para renderizar widget

**Decisão:** Widget Up Next não executa mais de 3 chamadas de API síncronas para o primeiro render.

**Implementação:**
- Buscar todas as séries em progresso: 1 chamada Supabase.
- Buscar detalhes de temporada: cacheadas (custo 0 se já em cache) ou batched.
- Renderizar primeiros 3 cards imediatamente, resto via IntersectionObserver (lazy).

**Por que:**
- Limite do TMDB: 40 requests/10s. Com 10+ séries sem cache: 10 calls síncronas = 25% do limite consumido só no Up Next.
