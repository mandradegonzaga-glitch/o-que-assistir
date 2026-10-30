# Feature Specification: qualidade-a11y-seguranca

> Feature ID: 008
> Created: 2026-10-28
> Status: In Progress
> Branch de trabalho: `004-series-tracking` (decisão do usuário — ver D001-001)

## Overview

Rodada de melhorias de qualidade guiada pelas skills instaladas em 2026-10-28
(`accessibility-compliance`, `web-design-guidelines`, `responsive-design`,
`frontend-design`, `modern-javascript-patterns`), mais reaproveitamentos
encontrados nas versões antigas do projeto (`E:\Trabalhos\O que assistir\`).

Não adiciona fluxos novos grandes: corrige segurança, acessibilidade, bugs
visíveis e recupera pequenas funcionalidades perdidas.

---

## Expectation

> O app fica seguro contra XSS, utilizável por teclado e leitor de tela
> (WCAG 2.2) e sem bugs visíveis, sem mudar as funcionalidades existentes.

---

## User Stories

### US1: Segurança do conteúdo exibido (P1 - Critical)

**As a** usuário do app
**I want** que textos digitados por mim ou vindos do TMDB nunca executem código
**So that** minha conta e meus dados não sejam expostos

**Acceptance Criteria:**
- [x] Payload `<img src=x onerror=...>` aparece como texto na roleta, busca e resultados
- [x] Títulos com `&` e `"` continuam legíveis

### US2: Uso por teclado e leitor de tela (P1 - Critical)

**As a** pessoa que usa teclado ou leitor de tela
**I want** navegar pelos modais e controles sem ficar presa ou perdida
**So that** eu consiga usar o app inteiro

**Acceptance Criteria:**
- [x] Modais anunciados como diálogo, com foco preso e retorno ao fechar
- [x] Todos os controles clicáveis são `<button>` ou links (T001-012)
- [x] Todos os itens de abas e grupos de opção alcançáveis por setas

### US3: Filtros e buscas corretos (P1 - Critical)

**As a** usuário
**I want** que as buscas e filtros tragam o que eu pedi
**So that** eu encontre o que assistir

**Acceptance Criteria:**
- [x] Busca com `&`/`#` chega completa ao TMDB
- [x] Filtro "De 2026" traz lançamentos de 2026

### US4: Reaproveitamentos das versões antigas (P2 - Important)

**As a** usuário
**I want** links para crítica, ajuda nos filtros e a conquista Madrugador
**So that** eu decida melhor e me divirta mais

**Acceptance Criteria:**
- [x] Botões IMDb / Rotten Tomatoes no modal
- [x] Conquista "Madrugador"
- [x] Textos de ajuda nos filtros
- [x] Seções do modal avisam quando falham

---

## Functional Requirements (backlog completo)

Numeração = itens da análise de 2026-10-28. Status atualizado ao fim de cada item.

| ID | Requisito | Skill | Prioridade | Status |
|----|-----------|-------|------------|--------|
| FR-001 | Liberar zoom (remover `user-scalable=no`) | a11y | P1 | ✅ Done (T001-001) |
| FR-002 | Modais como diálogos acessíveis (foco, trap, Esc, retorno) | a11y | P1 | ✅ Done (T001-007) |
| FR-003 | Trocar `div`s clicáveis por `<button>` | a11y | P1 | ✅ Done (T001-012) |
| FR-004 | Abas da biblioteca com Espaço/setas e `tabindex` | a11y | P2 | ✅ Done (T001-012) — necessário junto do FR-003 |
| FR-005 | Rótulos em botões só com ícone | a11y | P2 | ✅ Done (T001-013) |
| FR-006 | `<label>` nos formulários de perfil e senha | a11y | P2 | ✅ Done (T001-015) |
| FR-007 | `aria-hidden` nos SVGs decorativos | a11y | P3 | ✅ Done (T001-016) |
| FR-008 | Contraste de textos com opacidade baixa | a11y | P2 | ✅ Done (T001-017) — achou texto branco ilegível nos temas Série/Dorama |
| FR-009 | Escape de HTML em todo `innerHTML` (XSS) | web-guidelines | P1 | ✅ Done (T001-002) |
| FR-010 | `encodeURIComponent` nas buscas | web-guidelines | P1 | ✅ Done (T001-003) |
| FR-011 | Revisar `outline: none` | web-guidelines | P2 | ✅ Done (T001-018) |
| FR-012 | Trocar `transition: all` | web-guidelines | P3 | ✅ Done (T001-021) |
| FR-013 | Imagens com `alt`, dimensões e `loading="lazy"` | web-guidelines | P2 | ✅ Done (T001-022) — também removeu `via.placeholder.com` |
| FR-014 | Trocar `alert/confirm/prompt` nativos | web-guidelines | P2 | ✅ Done (T001-023) |
| FR-015 | Desfazer em ações destrutivas | web-guidelines | P2 | ✅ Done (T001-024) — item único; "limpar tudo" usa confirmação (D001-014) |
| FR-016 | Atributos de formulário (`name`, `spellcheck`, senha mínima consistente) | web-guidelines | P3 | ✅ Done (T001-010, T001-015, T001-025) — `name` só nos campos de conta (D001-015) |
| FR-017 | Ano máximo dinâmico nos filtros | web-guidelines | P1 | ✅ Done (T001-004) |
| FR-018 | Estado na URL (modo, filtros, título aberto) | web-guidelines | P3 | ✅ Done (T001-039) |
| FR-019 | `Intl` para datas e números | web-guidelines | P3 | ✅ Done (T001-036) |
| FR-020 | `preconnect` para TMDB | web-guidelines | P3 | ✅ Done (T001-027) |
| FR-021 | `safe-area-inset` em elementos fixos | responsive | P2 | ✅ Done (T001-030) |
| FR-022 | `color-scheme: dark` | responsive | P2 | ✅ Done (T001-029) |
| FR-023 | Controles de episódios no celular | responsive | P2 | ✅ Done (T001-033) |
| FR-024 | Áreas de toque de 44×44px | responsive | P2 | ✅ Done (T001-032) |
| FR-025 | Textos longos (ellipsis, `min-width: 0`) | responsive | P3 | ✅ Done (T001-034) |
| FR-026 | `overscroll-behavior: contain` nos modais | responsive | P3 | ✅ Done (T001-031) |
| FR-027 | Identidade visual própria | frontend-design | P3 | ✅ Done (T001-042) |
| FR-028 | Fonte via `<link>` + `preconnect` | frontend-design | P3 | ✅ Done (T001-028) |
| FR-029 | Estilos inline → classes/tokens | frontend-design | P3 | ✅ Done (T001-040) |
| FR-030 | Padronizar emojis × SVG | frontend-design | P3 | ✅ Done (T001-041) |
| FR-031 | Momentos visuais de gamificação | frontend-design | P3 | ✅ Done (T001-043) |
| FR-032 | Migrar `legacy/script.js` para módulos ES (unificar `src/domain`) | modern-js | P1 | ✅ Done (T001-037) |
| FR-033 | `addEventListener` + delegação no lugar de `onclick` | modern-js | P2 | ✅ Done (T001-038) |
| FR-034 | Cliente TMDB único com erro/abort/cache | modern-js | P2 | ✅ Done (T001-035) |
| FR-035 | Proxy para a chave do TMDB | modern-js | P2 | ⏸️ Adiado — dependia de Edge Function no Supabase (D001-010) |
| FR-036 | Remover código morto + versionar cache do SW | modern-js | P1 | ✅ Done (T001-014) |
| FR-037 | Ajustar `.gitignore` | — | P1 | ✅ Done (T001-005) — premissa original estava errada |
| FR-038 | Funções sem `event` global (`switchMode`, `sortearFilme`, `mostrarTop10`) | — | P1 | ✅ Done (T001-006) — achado durante os testes |
| FR-R1 | Links IMDb / Rotten Tomatoes (de `temp/`) | reuso | P2 | ✅ Done (T001-008) |
| FR-R2 | Conquista "Madrugador" (de `v3/`) | reuso | P3 | ✅ Done (T001-009) |
| FR-R3 | Textos de ajuda nos filtros (de `React/`) | reuso | P3 | ✅ Done (T001-010) |
| FR-R4 | Avisar falha de seção do modal (ideia de `novo/`) | reuso | P2 | ✅ Done (T001-011) |
| FR-039 | Banner "Instalar App" cobre o botão FECHAR do modal | — | P2 | ✅ Done (T001-026) |
| FR-040 | Migração `localStorage` → Supabase para usuários da versão no ar | — | P1 | ⏸️ Adiado — nada no Supabase por enquanto (D001-010) |
| FR-041 | Tela de login/onboarding prender o foco (fundo `inert`) | a11y | P2 | ✅ Done (T001-019) — achado no T001-018 |

---

## Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-001 | Segurança | Zero execução de HTML vindo de usuário/API |
| NFR-002 | Acessibilidade | WCAG 2.2 AA nos fluxos principais |
| NFR-003 | Regressão | Suíte Jest 100% verde a cada item |

---

## Architecture Analysis

### Current Architecture (Relevant)

- O app roda de `src/main.js` (módulos ES, sem build): `src/app/` funcionalidades, `src/ui/` interface, `src/api/` Supabase e TMDB, `src/domain/` e `src/utils/` lógica pura testada.
- Eventos por delegação em `src/app/actions.js` (`data-action`, `data-input`, `data-change`, `data-enter`).
- `sw.js`: network-first nos arquivos do app, `CACHE_VERSION` gera os nomes dos caches.

### Patterns to Follow

- Funções puras novas vão em `src/domain` ou `src/utils`, com teste em `tests/`.
- Arquivo novo em `src/` entra na lista `STATIC_ASSETS` do `sw.js`.
- Comentários em português, curtos, explicando o porquê.

### Risks & Tech Debt

- ~~Service worker serve JS antigo~~ — corrigido em T001-014 (network-first + `CACHE_VERSION`).
- `src/api/tmdbSeries.js` não é usado pelo app (lógica equivalente em `src/app/episodes.js` + `src/api/tmdb.js`); fica para decidir se sai.

---

## Out of Scope

- Funcionalidades novas grandes (streaks, match mode — features 005 e 006)
- Troca de stack (React etc.)

---

## Migrations

| Migration | Created | Status | Tasks |
|-----------|---------|--------|-------|
| 001 | 2026-10-28 | in-progress | 43/43 concluídas; restam FR-035 e FR-040 (D001-010) |
