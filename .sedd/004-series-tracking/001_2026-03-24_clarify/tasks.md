# Tasks — Migration 001

**Feature:** 004-series-tracking
**Migration:** 001
**Date:** 2026-03-24
**Status:** pending

---

## T001-001 — Criar tabela `episode_progress` no banco

- **Layer:** Database
- **File:** `database/episode_progress.sql` (novo)
- **Source:** TASK_SOURCE:user-req + TASK_SOURCE:constraint (RLS)
- **Priority:** 🔴 Blocker (todos os outros dependem disso)
- **Tests:** N/A (SQL — validar manualmente no Supabase)

**O que fazer:**
```sql
CREATE TABLE episode_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, series_id, season_number, episode_number)
);
ALTER TABLE episode_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own episode progress"
  ON episode_progress FOR ALL USING (auth.uid() = user_id);
```

---

## T001-002 — Criar `src/api/tmdbSeries.js`

- **Layer:** API
- **File:** `src/api/tmdbSeries.js` (novo)
- **Source:** TASK_SOURCE:ai-suggestion + TASK_SOURCE:decision (cache 1h)
- **Priority:** 🔴 Blocker (domínio e widget dependem disso)
- **Tests:** N/A (calls externas — mock em integração)

**O que fazer:**
- `fetchSeasonDetails(seriesId, seasonNumber)` → dados de episódios via TMDB
- Cache com TTL de 1 hora (reusar `src/utils/cache.js`)
- Filtrar Season 0 antes de retornar

---

## T001-003 — Criar `src/domain/seriesProgress.js`

- **Layer:** Domain (puro, testável)
- **File:** `src/domain/seriesProgress.js` (novo)
- **Source:** TASK_SOURCE:ai-suggestion + TASK_SOURCE:edge-case
- **Priority:** 🔴 Blocker (widget e testes dependem disso)
- **Tests:** `tests/domain/seriesProgress.test.js`

**Funções puras a implementar:**
- `getNextEpisode(watchedEpisodes, seasonDetails)` → `{ season, episode }` ou `null`
- `calcProgressPercent(watchedEpisodes, seasonDetails)` → `0-100`
- `isSeriesCompleted(watchedEpisodes, seasonDetails)` → `boolean`
- `filterSeason0(seasons)` → array sem `season_number === 0`
- `buildEpisodeKey(seriesId, season, episode)` → string chave única

---

## T001-004 — Escrever testes para `seriesProgress.js`

- **Layer:** Tests
- **File:** `tests/domain/seriesProgress.test.js` (novo)
- **Source:** TASK_SOURCE:ai-suggestion (TDD)
- **Priority:** 🔴 Deve rodar ANTES de implementar T001-003
- **Tests:** próprios

**Cenários obrigatórios:**
- `getNextEpisode`: série com progresso parcial, série completa, série sem episódios
- `calcProgressPercent`: 0%, 50%, 100%
- `isSeriesCompleted`: true/false
- `filterSeason0`: remove season 0, preserva o resto
- `buildEpisodeKey`: formato correto

---

## T001-005 — Funções Supabase para episode_progress

- **Layer:** API (Supabase)
- **File:** `legacy/supabase-config.js` (modificar)
- **Source:** TASK_SOURCE:user-req
- **Priority:** 🟡 Depends on T001-001
- **Tests:** N/A (integração manual)

**Funções a adicionar:**
```js
async function supabaseMarkEpisodeWatched(seriesId, seasonNumber, episodeNumber)
async function supabaseGetSeriesProgress(seriesId)
async function supabaseGetAllSeriesInProgress()
async function supabaseUnmarkEpisodeWatched(seriesId, seasonNumber, episodeNumber)
```

---

## T001-006 — HTML do widget Up Next

- **Layer:** UI
- **File:** `index.html` (modificar)
- **Source:** TASK_SOURCE:user-req
- **Priority:** 🟡 Depends on T001-003
- **Tests:** visual

**O que adicionar:**
```html
<section id="up-next-section" class="up-next-section" hidden>
  <h2>Continuar Assistindo</h2>
  <div id="up-next-list" class="up-next-list">
    <!-- lazy loaded -->
  </div>
</section>
```
Posição: antes da seção de sorteio, após o header.

---

## T001-007 — CSS do widget Up Next

- **Layer:** UI
- **File:** `src/styles/style.css` (modificar)
- **Source:** TASK_SOURCE:user-req
- **Priority:** 🟡 Depends on T001-006
- **Tests:** visual

**O que adicionar:**
- `.up-next-section` — seção container com padding/margin padrão
- `.up-next-list` — flex wrap, gap consistente
- `.up-next-card` — card horizontal (thumb + info + botão "Assistir")
- `.up-next-card__progress` — barra de progresso da série
- Estado de loading skeleton

---

## T001-008 — Implementar widget Up Next (lazy)

- **Layer:** UI (script)
- **File:** `legacy/script.js` (modificar)
- **Source:** TASK_SOURCE:constraint (lazy obrigatório)
- **Priority:** 🟡 Depends on T001-002, T001-003, T001-005, T001-006, T001-007
- **Tests:** visual

**O que fazer:**
- Carregar widget APENAS após `DOMContentLoaded` + `requestIdleCallback` (ou setTimeout 500ms fallback)
- Chamar `supabaseGetAllSeriesInProgress()` para buscar séries
- Para cada série: `fetchSeasonDetails()` (cacheado 1h) → `getNextEpisode()`
- Renderizar cards com `IntersectionObserver` ou batch de máx. 5
- Ocultar seção se não houver séries em andamento

**Restrição crítica:** ❌ NÃO chamar na inicialização síncrona — só lazy.

---

## T001-009 — UI de marcação de episódios no modal de série

- **Layer:** UI (script)
- **File:** `legacy/script.js` (modificar) + `src/styles/style.css`
- **Source:** TASK_SOURCE:user-req
- **Priority:** 🟡 Depends on T001-002, T001-005
- **Tests:** visual

**O que fazer:**
- No modal de detalhes de série: adicionar aba/seção "Episódios"
- Selector de temporada (dropdown)
- Lista de episódios com checkbox de assistido
- Estado persistido via `supabaseMarkEpisodeWatched()` / `supabaseUnmarkEpisodeWatched()`
- Season 0 não aparece na lista

---

## T001-010 — Wiring: marcar episódio → atualizar Up Next

- **Layer:** Integration
- **File:** `legacy/script.js` (modificar)
- **Source:** TASK_SOURCE:user-req
- **Priority:** 🟢 Last — depends on T001-008, T001-009
- **Tests:** visual

**O que fazer:**
- Após `supabaseMarkEpisodeWatched()` com sucesso: invalidar cache local e re-render Up Next
- Se série completada: remover do widget Up Next
- Otimismo opcional: atualizar UI antes de confirmar resposta Supabase

---

## Ordem de Execução Recomendada

```
T001-004 (escrever testes primeiro — TDD)
  → T001-003 (implementar domínio até testes passarem)
  → T001-001 (criar tabela SQL)
  → T001-002 (criar API TMDB)
  → T001-005 (funções Supabase)
  → T001-006 + T001-007 (HTML + CSS em paralelo)
  → T001-008 (widget lazy)
  → T001-009 (UI de marcação no modal)
  → T001-010 (wiring final)
```
