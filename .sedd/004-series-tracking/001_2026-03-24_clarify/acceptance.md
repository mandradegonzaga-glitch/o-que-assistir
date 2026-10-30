# Acceptance Criteria — Migration 001

**Feature:** 004-series-tracking
**Migration:** 001
**Date:** 2026-03-24

---

## Critérios Funcionais

### AC-001 — Marcar episódio como assistido
- [ ] Usuário logado pode marcar S01E01 de qualquer série como assistido
- [ ] Marcação persiste no Supabase (tabela `episode_progress`)
- [ ] Re-marcar o mesmo episódio não duplica o registro (idempotente)
- [ ] Usuário pode desmarcar episódio marcado

### AC-002 — Widget Up Next
- [ ] Widget "Continuar Assistindo" aparece na tela principal
- [ ] Exibe cada série em andamento com: poster, título, próximo episódio (S0XE0Y)
- [ ] NÃO aparece para usuário não logado
- [ ] NÃO aparece se usuário não tem séries em andamento
- [ ] NÃO exibe séries 100% concluídas

### AC-003 — Progresso de série
- [ ] Exibe "S02E05 de 13 episódios" (ou formato equivalente)
- [ ] Barra de progresso visual representa % de episódios assistidos
- [ ] Season 0 (especiais TMDB) não aparece na contagem de progresso

### AC-004 — Lazy loading
- [ ] Widget NÃO bloqueia carregamento inicial da página
- [ ] Sorteio funciona normalmente antes do widget carregar
- [ ] Widget carrega no máximo 2s após o page load (ou na primeira interação)

---

## Critérios Técnicos

### AC-005 — Testes unitários
- [ ] `tests/domain/seriesProgress.test.js` existe e passa (≥ 15 testes)
- [ ] Cobertura de `src/domain/seriesProgress.js` ≥ 80%
- [ ] `npm test` passa todos os 89 testes existentes + novos

### AC-006 — Performance de API
- [ ] Widget nunca dispara mais de 3 chamadas síncronas de API no load inicial
- [ ] Cache de temporada com TTL de 1h funciona (segunda visita: 0 chamadas TMDB)

### AC-007 — Banco de dados
- [ ] Tabela `episode_progress` existe com UNIQUE constraint
- [ ] RLS ativo: usuário A não vê dados do usuário B
- [ ] `watch_history` não foi modificada

---

## Cenários de Borda

### AC-008 — Edge cases
- [ ] Série com apenas 1 temporada e 1 episódio: ao marcar → aparece como concluída
- [ ] Séries com episódios marcados fora de ordem: nextEpisode retorna o menor não-marcado
- [ ] Série em andamento (novos eps semanais): não quebra mesmo com total de eps variável
- [ ] Usuário sem conexão: app não quebra, Up Next não carrega silenciosamente

---

## Definition of Done

Todas as tasks T001-001 a T001-010 implementadas E:
- `npm test` → ✅ todos passando (incluindo novos testes)
- Widget visível e funcional em ambiente de desenvolvimento
- Tabela SQL criada e testada manualmente no Supabase
- Nenhuma regressão nas funcionalidades existentes (sorteio, auth, histórico)
