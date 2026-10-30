# Feature Specification: Core Discovery

> Feature ID: 001
> Created: 2026-03-24
> Status: Implemented

## Overview

Sistema principal de descoberta de filmes e séries. O usuário recebe sugestões aleatórias e pode filtrar por tipo (filme, série, dorama), gênero, ano e nota. É o coração do app — transforma a indecisão de "o que assistir?" em uma experiência divertida e rápida.

---

## Expectation

O usuário consegue descobrir filmes e séries de forma rápida e personalizada, com filtros combinados, sem precisar sair do app para buscar informações externas. A experiência deve ser fluida, cinematic e viciante.

---

## DEVE (MUST)

- [x] Buscar filmes/séries via TMDB API com randomização real
- [x] Filtrar por tipo: Filmes, Séries, K-dramas (doramas)
- [x] Filtrar por gênero (múltipla seleção)
- [x] Filtrar por ano/década
- [x] Filtrar por nota mínima (rating threshold)
- [x] Exibir card com poster, título, ano, gêneros e nota
- [x] Modal de detalhes com sinopse, elenco e ações (watchlist, assistido, blacklist)
- [x] Persistir os itens adicionados no Supabase
- [x] Funcionar offline via Service Worker (assets cacheados)
- [x] Ignorar itens que estão na blacklist do usuário

## NÃO DEVE (MUST NOT)

- [ ] Sugerir o mesmo item repetidamente na mesma sessão
- [ ] Exibir itens que estão na blacklist do usuário
- [ ] Fazer chamadas desnecessárias à API sem filtros ativos
- [ ] Usar localStorage como armazenamento primário (usar Supabase)
- [ ] Travar ou mostrar tela em branco se a API TMDB falhar

---

## User Stories

### US1: Descoberta Aleatória (P1 - Critical)

**As a** usuário indeciso
**I want** receber uma sugestão aleatória de filme/série
**So that** posso decidir o que assistir sem esforço

**Acceptance Criteria:**
- [x] Botão de "embaralhar" gera nova sugestão a cada clique
- [x] Sugestão reflete os filtros ativos
- [x] Card exibe poster de alta qualidade + metadados essenciais

### US2: Filtros Combinados (P1 - Critical)

**As a** usuário com preferências específicas
**I want** combinar filtros de gênero, tipo e ano
**So that** recebo sugestões alinhadas com meu humor atual

**Acceptance Criteria:**
- [x] Todos os filtros funcionam em combinação
- [x] Estado dos filtros persiste na sessão
- [x] Filtro de tipo (filme/série/dorama) muda o tema visual da UI

### US3: Detalhes do Título (P2 - Important)

**As a** usuário interessado em um título
**I want** ver informações completas antes de decidir assistir
**So that** faço uma escolha informada

**Acceptance Criteria:**
- [x] Modal abre com sinopse, elenco principal e nota
- [x] Botões de ação no modal: Watchlist, Assistido, Blacklist
- [x] Fechar modal retorna ao card atual sem perder estado

---

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Integração com TMDB API (discover endpoint) | P1 | ✅ Done |
| FR-002 | Filtro por tipo: movie / tv / dorama | P1 | ✅ Done |
| FR-003 | Filtro por gênero (multi-select) | P1 | ✅ Done |
| FR-004 | Filtro por ano/década | P2 | ✅ Done |
| FR-005 | Filtro por nota mínima | P2 | ✅ Done |
| FR-006 | Randomização real (múltiplas páginas TMDB) | P1 | ✅ Done |
| FR-007 | Exclusão de blacklisted items das sugestões | P1 | ✅ Done |
| FR-008 | Modal de detalhes com elenco | P2 | ✅ Done |
| FR-009 | Filtro de humor/vibe (Vibe Filter) | P3 | 🔲 Pending |

---

## Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-001 | Performance da descoberta | Novo card < 1.5s |
| NFR-002 | Offline fallback | Assets cacheados via SW |
| NFR-003 | Responsividade | Mobile-first, funciona em 320px |
| NFR-004 | Tema visual dinâmico | Muda conforme tipo selecionado |

---

## Architecture Analysis

### Current Architecture (Relevant)

- **script.js** — Lógica principal de discovery, chamadas à TMDB API, renderização de cards
- **supabase-config.js** — Funções para blacklist/watchlist/history que influenciam o discovery
- **index.html** — UI dos filtros e área de exibição do card
- **style.css** — Temas dinâmicos por tipo (Cinema Red, Purple, etc.)

### Files to Modify

| File | Reason |
|------|--------|
| script.js | Adicionar Vibe Filter (P3 pendente) |
| style.css | Ajustes de tema se necessário |

### Patterns to Follow

- Funções async/await para chamadas à API
- Supabase como fonte de verdade para dados do usuário
- Service Worker para cache de assets estáticos

---

## Open Questions

- [ ] Vibe Filter: usar tags emocionais via TMDB keywords ou definir lista manual?
- [ ] Paginação da descoberta: limitar a X páginas aleatórias para controlar custos de API?

---

## Migrations

| Migration | Created | Status | Tasks |
|-----------|---------|--------|-------|
| - | - | - | - |

> Run `/sedd.clarify` para criar uma migração com clarificações e tarefas.
