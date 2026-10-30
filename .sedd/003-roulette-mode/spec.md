# Feature Specification: Roulette Mode

> Feature ID: 003
> Created: 2026-03-24
> Status: Implemented

## Overview

Modo de roleta gamificado para decisão entre múltiplos filmes/séries. O usuário adiciona de 3 a 5 títulos e "gira" para que o app escolha aleatoriamente. Transforma a indecisão em um jogo — a escolha vira um momento de diversão social.

---

## Expectation

O usuário (especialmente em grupo) adiciona títulos candidatos, gira a roleta com animação satisfatória e aceita o resultado como "destino". O histórico de sorteios e os roulette wins são salvos para gamificação futura.

---

## DEVE (MUST)

- [x] Adicionar 3 a 5 títulos à roleta via busca ou da lista de descoberta
- [x] Animação de giro visualmente satisfatória antes de revelar o vencedor
- [x] Revelar vencedor com destaque claro (poster, título, confete/efeito)
- [x] Salvar histórico de sorteios no Supabase (`sorteio_history`)
- [x] Incrementar contador de roulette_wins no perfil do usuário
- [x] Permitir girar novamente sem precisar re-adicionar os títulos
- [x] Funcionar em mobile com toque (touch events)

## NÃO DEVE (MUST NOT)

- [ ] Permitir roleta com menos de 2 títulos
- [ ] Revelar o vencedor antes da animação terminar
- [ ] Salvar duplicatas no histórico para o mesmo sorteio
- [ ] Bloquear o botão de girar durante animação sem feedback visual

---

## User Stories

### US1: Sorteio Gamificado (P1 - Critical)

**As a** usuário indeciso em grupo
**I want** girar uma roleta com as opções de filmes
**So that** a decisão se torna um jogo e todos aceitam o resultado

**Acceptance Criteria:**
- [x] Animação de giro > 2 segundos antes de parar
- [x] Vencedor exibido com destaque visual (poster grande, nome, efeito)
- [x] Botão "Girar de Novo" disponível após resultado

### US2: Histórico de Sorteios (P2 - Important)

**As a** usuário que usa a roleta frequentemente
**I want** ver o histórico dos meus sorteios anteriores
**So that** posso lembrar o que foi escolhido antes

**Acceptance Criteria:**
- [x] Sorteio salvo no Supabase ao revelar vencedor
- [x] Histórico acessível na aba Biblioteca
- [x] Roulette wins incrementado no perfil

### US3: Roleta Compartilhada (P3 - Future)

**As a** usuário em grupo
**I want** compartilhar a tela da roleta em tempo real
**So that** todos vejam o giro ao mesmo tempo

**Acceptance Criteria:**
- [ ] Sessão de roleta compartilhada via link (futuro — requer Supabase Realtime)

---

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Adicionar títulos à roleta (3-5) | P1 | ✅ Done |
| FR-002 | Animação de giro com resultado | P1 | ✅ Done |
| FR-003 | Salvar sorteio no histórico | P1 | ✅ Done |
| FR-004 | Incrementar roulette_wins | P2 | ✅ Done |
| FR-005 | Limpar sorteio history | P2 | ✅ Done |
| FR-006 | Adicionar título direto da descoberta | P2 | ✅ Done |
| FR-007 | Roleta compartilhada em tempo real | P3 | 🔲 Future |

---

## Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-001 | Fluidez da animação | 60fps, sem jank |
| NFR-002 | Touch support | Funciona em iOS/Android via PWA |
| NFR-003 | Estado persistente | Itens da roleta sobrevivem a reload (sessionStorage) |

---

## Architecture Analysis

### Current Architecture (Relevant)

- **script.js** — Lógica de roulette: adicionar itens, animação, revelar vencedor
- **supabase-config.js** — `supabaseAddToSorteioHistory`, `supabaseGetSorteioHistory`, `supabaseClearSorteioHistory`, `supabaseIncrementRouletteWins`
- **supabase-schema.sql** — Tabela `sorteio_history`

### Risks

- Roleta compartilhada via Realtime requer nova coluna de sessão na tabela e subscription setup

---

## Open Questions

- [ ] Roleta com mais de 5 itens seria útil? (UX pode degradar com muitos itens)
- [ ] Modo "torneio" (bracket eliminatório) seria uma evolução natural da roleta?

---

## Migrations

| Migration | Created | Status | Tasks |
|-----------|---------|--------|-------|
| - | - | - | - |

> Run `/sedd.clarify` para criar uma migração com clarificações e tarefas.
