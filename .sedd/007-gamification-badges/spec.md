# Feature Specification: Gamification & Badges

> Feature ID: 004
> Created: 2026-03-24
> Status: Implemented (20 badges em 3 categorias; compartilhar badge segue futuro)

## Overview

Sistema de conquistas e badges que recompensa o usuário por ações no app. 88+ badges planejadas cobrindo desde "Primeiro Filme Assistido" até conquistas raras como "Maratonista". Gamificação central para retenção D7/D30.

---

## Expectation

O usuário sente progressão constante ao usar o app. Cada ação significativa (assistir filme, usar roleta, completar série) pode desbloquear uma badge. Badges visíveis no perfil criam status e incentivam compartilhamento social.

---

## DEVE (MUST)

- [x] Sistema de badges persistido no Supabase (`user_badges`)
- [x] Verificar e desbloquear badges automaticamente após ações relevantes
- [x] Exibir badges desbloqueadas no perfil do usuário
- [x] Notificação/celebração visual ao desbloquear nova badge
- [x] Definir e implementar ao menos 20 badges prioritárias (P1) — 26 em 2026-11-03
- [ ] Exibir badges bloqueadas com dica do que fazer para desbloquear (P2)
- [x] Categorizar badges por tipo — Jornada, Gêneros, Hábitos e Social (Social em 2026-11-03: Turma, Popular, Indicador, Curador, Bilheteiro, Par Perfeito)

## NÃO DEVE (MUST NOT)

- [ ] Desbloquear a mesma badge duas vezes para o mesmo usuário
- [ ] Verificar badges em background sem ação do usuário (evitar spam de notificações)
- [ ] Mostrar todas as badges bloqueadas sem contexto (UX confusa)
- [ ] Depender de dados externos para calcular badges (usar apenas Supabase)

---

## User Stories

### US1: Desbloquear Badge (P1 - Critical)

**As a** usuário ativo
**I want** receber uma badge ao atingir um marco
**So that** me sinto recompensado e motivado a continuar

**Acceptance Criteria:**
- [x] Badge desbloqueada automaticamente após ação trigger
- [x] Animação/celebração exibida imediatamente
- [x] Badge aparece no perfil permanentemente

### US2: Visualizar Conquistas (P2 - Important)

**As a** usuário colecionador
**I want** ver todas as badges disponíveis e meu progresso
**So that** sei quais metas perseguir

**Acceptance Criteria:**
- [ ] Grid de badges no perfil mostrando desbloqueadas e bloqueadas
- [ ] Badges bloqueadas exibem dica de como desbloquear
- [ ] Contador total "X de Y badges"

### US3: Compartilhar Badge (P3 - Future)

**As a** usuário orgulhoso de uma conquista rara
**I want** compartilhar minha badge nas redes sociais
**So that** mostro meu progresso e atraio novos usuários

**Acceptance Criteria:**
- [ ] Botão de compartilhar no card da badge
- [ ] Imagem gerada automaticamente (OG card) para compartilhamento

---

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Persistência de badges no Supabase | P1 | ✅ Done |
| FR-002 | `supabaseUnlockBadge` e `supabaseCheckBadge` | P1 | ✅ Done |
| FR-003 | Celebração visual ao desbloquear | P1 | ✅ Done |
| FR-004 | 20 badges prioritárias definidas e implementadas | P1 | 🔲 Pending |
| FR-005 | Grid de badges no perfil (desbloq + bloqueadas) | P2 | 🔲 Pending |
| FR-006 | Dicas de desbloqueio para badges bloqueadas | P2 | 🔲 Pending |
| FR-007 | Categorias de badges | P2 | 🔲 Pending |
| FR-008 | Compartilhamento de badge em redes sociais | P3 | 🔲 Future |

---

## Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-001 | Unicidade | Nenhuma badge duplicada por usuário |
| NFR-002 | Performance | Verificação de badge < 500ms após ação |
| NFR-003 | Escalabilidade | Schema suporta até 200 badges distintas |

---

## Architecture Analysis

### Current Architecture (Relevant)

- **supabase-config.js** — `supabaseGetBadges`, `supabaseUnlockBadge`, `supabaseCheckBadge`
- **supabase-schema.sql** — Tabela `user_badges` (user_id, badge_name, unlocked_at)
- **script.js** — Verificações de badge chamadas após ações (assistir, roleta, etc.)

### Files to Modify

| File | Reason |
|------|--------|
| script.js | Definir 20 badges prioritárias e seus triggers |
| index.html | Grid de badges no modal de perfil |
| style.css | Layout do grid de badges e cards locked/unlocked |
| supabase-schema.sql | Adicionar tabela `badge_definitions` com metadados |

---

## Badge Categories (Planejadas)

| Categoria | Exemplos |
|-----------|---------|
| Descoberta | Primeiro Filme, 10 Filmes, 50 Filmes, Cinéfilo |
| Maratona | Primeiro Episódio, Maratonista de Fim de Semana |
| Roleta | Primeiro Sorteio, 10 Sorteios, Viciado em Roleta |
| Social | Primeiro Match, 5 Matches (futuro) |
| Especial | Dorameiro, Nerd de Séries, Explorador de Gêneros |

---

## Open Questions

- [ ] Badges ter níveis (Bronze/Prata/Ouro) ou cada uma é única?
- [ ] Tabela `badge_definitions` no Supabase ou hardcoded no JS?

---

## Migrations

| Migration | Created | Status | Tasks |
|-----------|---------|--------|-------|
| - | - | - | - |

> Run `/sedd.clarify` para criar uma migração com clarificações e tarefas.
