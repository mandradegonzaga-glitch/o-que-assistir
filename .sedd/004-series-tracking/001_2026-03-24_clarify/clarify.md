# Clarification - Migration 001

**Timestamp:** 2026-03-24
**Branch:** 004-series-tracking
**Parent:** (none)

## Expected Outcome

Usuário consegue marcar episódios individuais como assistidos e ver no widget "Up Next" o próximo episódio de cada série em andamento, de forma lazy (não bloqueia o page load).

---

## Architecture Assessment

### Estado Atual
- `watch_history` rastreia TV como título único — sem nível de episódio
- `salvarHistorico()` marca a série inteira, não por episódio
- Cache atual (5min TTL) foi projetado para busca de filmes
- `src/domain/history.js` pode ser estendido sem conflito
- Endpoints TMDB de season/episode ainda não usados

### Dependências Impactadas
- Diretos: `legacy/supabase-config.js`, `legacy/script.js`, `database/supabase-schema.sql`
- Indiretos: `src/domain/history.js`, `src/state/appState.js`

### Riscos
- 🔴 Alto: Up Next widget pode disparar 10-20 chamadas de API — lazy loading obrigatório
- 🟡 Médio: Season 0 (especiais TMDB) pode quebrar lógica de progresso
- 🟡 Médio: Cache de 5min insuficiente para estrutura de temporada (usar 1h)
- 🟢 Baixo: RLS segue padrão existente
- 🟢 Baixo: Dados históricos não precisam de migração

---

## Expectation Details

### DEVE fazer:
- Criar tabela `episode_progress` no Supabase com RLS
- Criar funções Supabase para marcar/buscar episódios assistidos
- Criar `src/domain/seriesProgress.js` com lógica pura e testável
- Criar `src/api/tmdbSeries.js` para buscar temporadas/episódios da TMDB
- Implementar Up Next widget com lazy loading
- Cachear estrutura de temporada com TTL de 1 hora
- Filtrar Season 0 dos resultados do widget

### NÃO DEVE fazer:
- ❌ Migrar dados históricos de `watch_history` existentes
- ❌ Carregar o widget Up Next no page load inicial
- ❌ Fazer mais de 3 chamadas de API síncronas para renderizar o widget
- ❌ Modificar a tabela `watch_history` existente

---

## Notes & Discussions

### Note 001
**User said:** "continue" — sem restrições adicionais, expectativa confirmada como está.

**Key Points Extracted:**
- **[TASK_SOURCE:user-req]** Marcar episódio individual como assistido
- **[TASK_SOURCE:user-req]** Widget Up Next na tela principal
- **[TASK_SOURCE:constraint]** Lazy loading obrigatório por performance
- **[TASK_SOURCE:constraint]** Não migrar dados históricos de TV
- **[TASK_SOURCE:edge-case]** Season 0 (especiais TMDB) deve ser filtrado
- **[TASK_SOURCE:decision]** Cache de temporada com TTL de 1 hora
- **[TASK_SOURCE:ai-suggestion]** Criar domínio puro testável em src/domain/
- **[TASK_SOURCE:ai-suggestion]** Separar API TMDB em src/api/tmdbSeries.js
- **[TASK_SOURCE:decision]** Nova tabela episode_progress (não alterar watch_history)
- **[TASK_SOURCE:user-req]** Progresso da série visível (S02E05 de 13)
- **[TASK_SOURCE:edge-case]** Usuário pode marcar episódios fora de ordem
- **[TASK_SOURCE:constraint]** RLS obrigatório na nova tabela

