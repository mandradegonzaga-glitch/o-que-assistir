# Feature Specification: Series Tracking + Up Next

> Feature ID: 004
> Created: 2026-03-24
> Status: Planned (Prioridade Imediata)

## Overview

Tracking de progresso de séries por episódio e widget "Up Next" que exibe o próximo episódio a assistir. É a feature com maior impacto direto em retenção D7/D30 — transforma o app de ferramenta ocasional em parte da rotina diária de quem acompanha séries.

---

## Expectation

O usuário que está assistindo uma série consegue marcar episódios assistidos, ver seu progresso (S02E05 de 10), e ao abrir o app, vê imediatamente "Continue assistindo: Breaking Bad — S02E06". Isso cria o hábito de abrir o app toda vez que vai assistir mais um episódio.

---

## DEVE (MUST)

- [ ] Marcar episódio individual como assistido (S01E01, S01E02...)
- [ ] Exibir progresso da série: "Temporada 2, Episódio 5 de 13"
- [ ] Widget "Up Next" na tela principal mostrando próximo episódio de cada série em andamento
- [ ] Buscar número de temporadas/episódios via TMDB API (endpoint `/tv/{id}/season/{n}`)
- [ ] Persistir progresso por episódio no Supabase
- [ ] Distinguir entre série "em andamento" (assistindo) e "concluída" (todos os episódios marcados)
- [ ] Funcionar para doramas (mesma estrutura de temporada/episódio do TMDB)

## NÃO DEVE (MUST NOT)

- [ ] Misturar progresso de séries com histórico de filmes (tabelas separadas)
- [ ] Marcar série inteira como "assistida" sem confirmar episódios individuais (perda de granularidade)
- [ ] Fazer chamadas à TMDB por episódio (cachear estrutura da temporada)
- [ ] Exibir "Up Next" para séries já concluídas pelo usuário
- [ ] Bloquear marcação de episódios fora de ordem (usuário pode pular)

---

## User Stories

### US1: Tracking de Episódios (P1 - Critical)

**As a** usuário que acompanha séries regularmente
**I want** marcar episódios como assistidos conforme avanço
**So that** nunca perco o controle de onde parei

**Acceptance Criteria:**
- [ ] Modal/tela de série exibe lista de temporadas e episódios
- [ ] Cada episódio tem checkbox marcável
- [ ] Progresso salvo no Supabase em tempo real
- [ ] Barra de progresso exibida: "5/13 episódios"

### US2: Widget Up Next (P1 - Critical)

**As a** usuário com séries em andamento
**I want** ver na tela principal o que devo assistir a seguir
**So that** abro o app como parte do ritual de ver séries

**Acceptance Criteria:**
- [ ] Seção "Continue assistindo" visível na tela principal
- [ ] Exibe poster, nome da série e próximo episódio (S02E06)
- [ ] Clique abre detalhes do episódio/série
- [ ] Atualiza automaticamente ao marcar um episódio

### US3: Conclusão de Série (P2 - Important)

**As a** usuário que terminou uma série
**I want** receber celebração e ter a série marcada como concluída
**So that** tenha senso de conquista e o Up Next não fique poluído

**Acceptance Criteria:**
- [ ] Ao marcar último episódio, animação de celebração
- [ ] Série move para aba "Concluídas" na biblioteca
- [ ] Badge desbloqueada por completar série (integração com 007)

---

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Buscar estrutura da série via TMDB (temporadas + episódios) | P1 | 🔲 Pending |
| FR-002 | Tabela `episode_progress` no Supabase | P1 | 🔲 Pending |
| FR-003 | UI de seleção de episódios por temporada | P1 | 🔲 Pending |
| FR-004 | Widget "Up Next" na tela principal | P1 | 🔲 Pending |
| FR-005 | Barra de progresso da série | P1 | 🔲 Pending |
| FR-006 | Status: "assistindo" vs "concluída" | P2 | 🔲 Pending |
| FR-007 | Cache de estrutura da temporada (evitar re-fetch) | P2 | 🔲 Pending |
| FR-008 | Integração com badges ao concluir série | P2 | 🔲 Pending |
| FR-009 | Notificação de novo episódio disponível | P3 | 🔲 Future |

---

## Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-001 | Performance | Estrutura da temporada cacheada, sem re-fetch |
| NFR-002 | Consistência | Progresso sincronizado entre dispositivos |
| NFR-003 | UX | Up Next atualiza sem recarregar a página |

---

## Architecture Analysis

### Current Architecture (Relevant)

- **script.js** — `supabaseAddToHistory` atual marca série inteira, não episódios
- **supabase-config.js** — Necessita novas funções de episode tracking
- **supabase-schema.sql** — Nova tabela necessária

### New Table Needed

```sql
CREATE TABLE episode_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,           -- ID da série
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tmdb_id, season_number, episode_number)
);

-- View auxiliar para calcular progresso
CREATE VIEW series_progress AS
SELECT
  user_id,
  tmdb_id,
  COUNT(*) as episodes_watched,
  MAX(season_number) as last_season,
  MAX(episode_number) as last_episode,
  MAX(watched_at) as last_watched_at
FROM episode_progress
GROUP BY user_id, tmdb_id;
```

### New Functions Needed (supabase-config.js)

```javascript
supabaseMarkEpisodeWatched(tmdbId, season, episode)
supabaseGetSeriesProgress(tmdbId)
supabaseGetAllSeriesInProgress()  // Para o widget Up Next
supabaseGetNextEpisode(tmdbId)    // Calcula o próximo episódio
```

### Files to Modify

| File | Change |
|------|--------|
| supabase-schema.sql | Adicionar tabela `episode_progress` |
| supabase-config.js | 4 novas funções de tracking |
| script.js | UI de episódios + lógica Up Next |
| index.html | Seção Up Next + modal de episódios |
| style.css | Componentes de progresso e Up Next widget |

---

## UI/UX

```
┌─────────────────────────────────┐
│  Continue Assistindo            │
│                                 │
│  ┌──────┐  Breaking Bad        │
│  │ 🎬  │  S02E06 · "Peekaboo" │
│  └──────┘  ████████░░  80%     │
│                                 │
│  ┌──────┐  Dark                │
│  │ 🎬  │  S01E03 · "Sic Mundus"│
│  └──────┘  ███░░░░░░░  30%     │
└─────────────────────────────────┘
```

---

## Open Questions

- [ ] Exibir sinopse do episódio no modal de tracking?
- [ ] Como tratar séries com episódios especiais (Season 0 no TMDB)?
- [ ] Limite de séries no widget Up Next (exibir top 3 mais recentes)?

---

## Migrations

| Migration | Created | Status | Tasks |
|-----------|---------|--------|-------|
| - | - | - | - |

> Run `/sedd.clarify` para criar uma migração com clarificações e tarefas.
