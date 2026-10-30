# Implementation Progress

> Feature: 008-qualidade-a11y-seguranca
> Last Updated: 2026-10-30 (backlog concluído)
> Branch: `004-series-tracking` (D001-001) — **nada commitado** (D001-009: commit único ao final)

## Summary

| Backlog (spec.md → Functional Requirements) | Qtd |
|---|---|
| ✅ Concluídos | 43 |
| ⏸️ Adiados (dependem do Supabase — D001-010) | 2 |
| **Total** | **45** |

| Migration | Tasks | Done | Progress |
|-----------|-------|------|----------|
| 001 | 43 | 43 | 100% |

---

## Para retomar

**Backlog encerrado:** só restam FR-035 e FR-040, que dependem do Supabase (D001-010). Depois, conforme D001-009, vem o commit único da feature.

**Regras combinadas com o usuário (pedido em 2026-10-28):**
1. Um item por vez; perguntar "podemos continuar?" antes do próximo (exceção em 2026-10-30: 18 itens em sequência, a pedido).
2. Testar de verdade (Jest + Chrome em `http://localhost:5173`), limpando service worker/caches no início, e mostrar evidência.
3. Registrar cada item em `tasks.md`, `acceptance.md` (+ `evidence/`), `decisions.md` quando houver escolha, `spec.md`, `CHANGELOG.md`, `_meta.json` e `docs/FUNCIONALIDADES.md` (CRLF).
4. Não mexer no Supabase (schema/dados/Edge Functions); só usar o que o cliente já chama.
5. Commit só quando todo o backlog terminar.

**Armadilhas já conhecidas:**
- O site não funciona por `file://` (módulos ES): usar `INICIAR_SITE.bat`, e testar também o que muda ao abrir assim.
- Arquivo novo em `src/` precisa entrar em `STATIC_ASSETS` no `sw.js`, e `CACHE_VERSION` deve subir a cada deploy.
- `style.css` e `FUNCIONALIDADES.md` usam CRLF; scripts de edição devem preservar.
- A extensão do Chrome bloqueia retorno de JS com query string ou chaves com "password"/"token" — mascarar.
- Comandos com regex dentro de `node -e` na shell perdem o escape — escrever scripts em arquivo (scratchpad).
- `npm test` (não `npx jest`): a config fica em `config/jest.config.js`.

---

## Feito nesta sessão (2026-10-28)

| Task | Item | O que mudou |
|---|---|---|
| T001-001 | FR-001 | Zoom liberado; campos 16px em tela de toque (iOS) |
| T001-002 | FR-009 | `escapeHtml()` em 13 interpolações de `innerHTML` (XSS) |
| T001-003 | FR-010 | `encodeURIComponent` nas buscas (`&`, `#`) |
| T001-004 | FR-017 | Ano atual nos filtros (bug: "De 2026" voltava vazio) |
| T001-005 | FR-037 | `.gitignore`: versiona `package-lock.json`, ignora `settings.local.json` |
| T001-006 | FR-038 | Funções sem `event` global |
| T001-007 | FR-002 | Modais acessíveis (foco, trap, `inert`, retorno) |
| T001-008 | FR-R1 | Links IMDb / Rotten Tomatoes |
| T001-009 | FR-R2 | Conquista "Madrugador" |
| T001-010 | FR-R3 | Textos de ajuda nos filtros |
| T001-011 | FR-R4 | Avisos quando seção do modal falha |
| T001-012 | FR-003/004 | `div`s clicáveis → `<button>` + setas em abas/radios |
| T001-013 | FR-005 | Rótulos em botões só com ícone |
| T001-014 | FR-036 | Service worker network-first + `CACHE_VERSION`; código morto removido; arquivos antigos em `../_arquivo-legacy/` |
| T001-015 | FR-006 | `<label>` no perfil/senha; dica de senha mínima corrigida (4→6) |
| T001-016 | FR-007 | 81 SVGs decorativos com `aria-hidden`; `<h1>` do login com nome |
| T001-017 | FR-008 | Contraste AA nos 3 temas (tokens `--accent-text`/`--accent-on`) |
| T001-018 | FR-011 | Foco sempre visível; elementos não mudam de forma ao focar |
| T001-019 | FR-041 | Login/onboarding prendem o foco |
| T001-020 | — | Aba "Criar Conta" testada; trap respeita tabindex "roving" |
| T001-021 | FR-012 | 19 `transition: all` → propriedades específicas |
| T001-022 | FR-013 | Imagens com alt/dimensões/lazy; placeholder local |
| T001-023 | FR-014 | `confirm()`/`alert()` → diálogo do app; Esc fecha só o topo |
| T001-024 | FR-015 | "Desfazer" (5 s / Ctrl+Z) nas remoções de item único |
| T001-025 | FR-016 | `name` e `spellcheck` nos campos de conta (2026-10-30) |

Testes: Jest 120 → **125** (9 suítes, todos passando). Evidências: `001_2026-10-28_melhorias/evidence/` (26 capturas + `contrast-audit.js`).

---

## Feito em 2026-10-30

| Task | Item | O que mudou |
|---|---|---|
| T001-025 | FR-016 | `name` e `spellcheck` nos campos de conta |
| T001-026 | FR-039 | Banner "Instalar App" abaixo dos modais (z-index 900) e em classes |
| T001-027 | FR-020 | `preconnect` para TMDB (API e imagens) |
| T001-028 | FR-028 | Fonte via `<link>` + `preconnect`; `@import` removido |
| T001-029 | FR-022 | `color-scheme: dark` (CSS e meta) |
| T001-030 | FR-021 | `viewport-fit=cover` + `safe-area-inset` no body, toast, banner, conquista e "voltar ao topo" |
| T001-031 | FR-026 | `overscroll-behavior: contain` em modais, login, onboarding, sugestões e episódios |
| T001-032 | FR-024 | Alvos de 44px em telas de toque/estreitas; ícones pequenos com área ampliada; ✕ da biblioteca visível sem hover |
| T001-033 | FR-023 | Controles de episódios em grade no celular, com rótulos claros ("Marcar temporada") |
| T001-034 | FR-025 | Textos longos: ellipsis/`overflow-wrap`; cabeçalho não passa da tela (excedia 11px em 390px) |
| T001-035 | FR-034 | Cliente único `src/api/tmdb.js` (URL, cache, erros, cancelamento) nos 18 pontos que usavam `fetch` |
| T001-036 | FR-019 | `src/utils/format.js` com `Intl`: notas (8,5), contagens e plurais |
| T001-037 | FR-032 | `legacy/` migrado para 13 módulos ES + `src/main.js`; espelhos trocados pelos módulos testados; lista única de conquistas |
| T001-038 | FR-033 | Delegação em `src/app/actions.js`: zero handler inline e zero `.onclick` |
| T001-039 | FR-018 | Estado na URL (`src/domain/urlState.js` + `src/app/urlSync.js`): modo, tipo, filtros, pessoa e título; link direto abre o título |
| T001-040 | FR-029 | Estilos inline → classes (132 → 1: a largura calculada da barra de progresso) |
| T001-041 | FR-030 | Só SVG como ícone: emojis removidos de filtros e botões; ✕/× e 📺 viraram SVG |
| T001-042 | FR-027 | Identidade "Sala escura": base ameixa, âmbar/teal/rosa por tipo, Big Shoulders Display + Atkinson Hyperlegible, bilhete como marca |
| T001-043 | FR-031 | Bilhete de conquista, vencedor da roleta em letreiro, progresso "n de 12"; confete respeita movimento reduzido |

Testes: Jest 125 → **145** (12 suítes, todos passando).

---

## O que falta

### ⏸️ Adiados (D001-010 — Supabase desabilitado pelo usuário)
| ID | Item |
|---|---|
| FR-035 | Proxy para a chave do TMDB (Edge Function) |
| FR-040 | Migração `localStorage` → Supabase para usuários da versão no ar (`Index/index.html`) — **fazer antes de publicar a versão nova** |

---

## Validações pendentes (precisam do usuário)

| O quê | Por quê |
|---|---|
| iPhone real | zoom/zoom automático dos campos (AC-001) |
| Com login | conquista Madrugador gravando no Supabase (AC-009), troca de senha (AC-015), desfazer com Supabase real (AC-024) |
| Leitor de tela (NVDA/VoiceOver) | nomes acessíveis de cards/perfil/diálogos (AC-013, AC-016) |
| Decisão visual | aprovar a nova identidade "Sala escura" (D001-018), que inclui texto escuro nos botões dos 3 temas |

---

## Supabase desabilitado

O projeto Supabase está desabilitado de propósito pelo usuário (motivo de D001-010), por isso o host não resolve e o console mostra `Failed to fetch` em `/auth/v1/user`. Não é bug. Testar como convidado ou com Supabase simulado; as validações "Com login" ficam para quando for reabilitado.

---

## Blocked Tasks

| Task | Blocked By | Notes |
|------|------------|-------|
| FR-035, FR-040 | D001-010 | Retomar quando o Supabase for liberado |

---

## Test Results

| Migration | Unit (Jest) | Navegador (Chrome) |
|-----------|-------------|--------------------|
| 001 | 145/145 ✅ | critérios AC-001…AC-043 ✅, com as ressalvas acima |
