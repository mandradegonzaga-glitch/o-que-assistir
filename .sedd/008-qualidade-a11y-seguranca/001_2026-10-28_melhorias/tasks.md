# Tasks — Migration 001

**Feature:** 008-qualidade-a11y-seguranca
**Migration:** 001
**Date:** 2026-10-28
**Status:** in-progress

## Summary

Total: 47 | Completed: 47 | Pending: 0 (restam só FR-035 e FR-040, adiados por D001-010)

Regra de trabalho (pedido do usuário): **um item por vez, testar, evidenciar e perguntar antes do próximo.** Os 18 itens de T001-026 em diante foram feitos em sequência a pedido do usuário em 2026-10-30.

---

## Tasks

### US1 — Segurança

- [x] T001-002 [US1] Escapar HTML antes de interpolar em `innerHTML` (FR-009) `src/utils/escapeHtml.js` `legacy/script.js`
  - Nova `escapeHtml()` + 6 testes em `tests/utils/escapeHtml.test.js`; espelho no topo do legacy.
  - Aplicado em 13 pontos: roleta, "Nenhum resultado para…", cards Up Next / Em Andamento, histórico de sorteios, blacklist, resultados, sugestões de ator, elenco, plataformas (nome + link), episódios.

### US2 — Acessibilidade

- [x] T001-001 [US2] Liberar zoom (FR-001) `index.html` `src/styles/style.css`
  - Removido `maximum-scale=1.0, user-scalable=no`.
  - `@media (pointer: coarse)` com 16px em `.input-dark` e `.episodes-season-select` para evitar zoom automático do iOS.
- [x] T001-007 [US2] Modais como diálogos acessíveis (FR-002) `index.html` `legacy/script.js` `src/styles/style.css`
  - `role="dialog"`, `aria-modal`, `aria-labelledby` nos 3 modais; `aria-label` no FECHAR.
  - `MutationObserver` (`initModalA11y`) cuida de foco inicial, trap de Tab, `inert` no fundo e retorno de foco.
  - Esc no modal de detalhes passa por `fecharModal()` (limpa estado de episódios).
- [x] T001-012 [US2] Controles clicáveis viram `<button>` + navegação por setas (FR-003, cobre também FR-004) `index.html` `legacy/script.js` `src/styles/style.css`
  - Convertidos 12 no HTML: abas de modo, 3 cards de tipo, perfil (`.user-pill`), pessoa selecionada, 3 abas da biblioteca (+ ids nas 2 abas de login).
  - Convertidos nos templates: item da biblioteca (botão abrir + botão remover lado a lado), histórico de sorteios, card "Em Andamento" (título é o botão, área clicável estendida por `::after`), ✕ da roleta.
  - `initRovingGroups()`: setas/Home/End em todo `tablist`/`radiogroup` — antes, "Série", "Dorama", "Roleta" e as abas não selecionadas eram **inalcançáveis por teclado** (`tabindex=-1` sem setas).
  - Removidos `handleTabKey`/`handleCardKey`; `<h3>` dos cards → `<span class="card__label">`; reset `:where(...)` com especificidade 0; `.sr-only`.
  - `aria-labelledby` corrigidos (`roulette-tab`, `login-tab`, `register-tab` apontavam para ids inexistentes).
- [x] T001-013 [US2] Rótulos em controles só com ícone (FR-005) `index.html` `legacy/script.js`
  - Varredura estática de todos os `<button>` do HTML e dos templates + revisão manual de links com imagem.
  - `aria-label` em: anterior/próximo do histórico (só tinham `title`), "×" do banner de instalação, ✕ da lista de ignorados ("Voltar a sugerir {título}"), logos de streaming ("Ver no {plataforma} (abre em nova aba)").
  - Símbolos e SVGs desses controles com `aria-hidden`; imagens redundantes com `alt=""`; `rel="noopener"` nos logos.
- [x] T001-015 [US2] `<label>` nos formulários de perfil e troca de senha (FR-006) `index.html` `src/styles/style.css`
  - Auditoria de todos os `input`/`select`: só os 4 campos do perfil/senha não tinham rótulo (os demais têm `<label>` ou `aria-label`).
  - Labels visíveis "Nome de exibição", "Email", "Nova senha", "Confirmar nova senha" (classe `.field-label`) + `name` e `autocomplete` (`nickname`, `email`, `new-password`).
  - Regra de 6 caracteres ligada ao campo por `aria-describedby`.
  - **Bug de texto corrigido:** cadastro dizia "Mínimo 4 caracteres", mas `registerUser()` exige 6.
- [x] T001-016 [US2] SVGs decorativos ocultos de leitores de tela (FR-007) `index.html` `legacy/script.js`
  - 81 SVGs inline (43 no HTML, 38 em strings do JS) com `aria-hidden="true"` — antes só 5 tinham.
  - Todas as strings JS com `<svg` eram de aspas simples ou template literal (atributo com aspas duplas seguro).
  - Único SVG não decorativo: logo do `<h1>` do login (heading vazio) → `<span class="sr-only">O Que Assistir?</span>` no `<h1>`; `<p>` visível com o mesmo texto marcado `aria-hidden` para não ler duas vezes.
- [x] T001-017 [US2] Contraste WCAG AA em todos os textos (FR-008) `src/styles/style.css` `index.html` `legacy/script.js`
  - Medição automática (`evidence/contrast-audit.js`): cor final com opacidade acumulada × fundo efetivo, mínimo 4.5:1 (3:1 texto grande).
  - Tokens neutros: `--text-secondary` 0.6→0.7, `--text-tertiary` 0.4→0.6, `--text-muted` 0.25→0.5.
  - Novos tokens por tema: `--accent-text` (accent como texto: filme `#ff4d55`) e `--accent-on` (texto sobre accent: filme branco, série/dorama `#111`). 13 regras de texto e 11 de fundo accent migradas.
  - **Bug encontrado:** nos temas Série e Dorama o texto branco sobre o accent ficava em 2.15:1 e 3.53:1 (botões principais, aba ativa).
  - Hover do tema Filme escurece (`#d40812`) em vez de clarear (`#ff1a1a` dava 3.88:1 com branco).
  - Conquistas bloqueadas: só o ícone fica apagado (antes o card inteiro tinha `opacity: 0.35` → texto em 1.38:1).
  - `.btn-danger` texto `#f87171`; rodapé sem `opacity: 0.5`; "Esqueceu sua senha?", `#666`/`#888` inline → tokens.
- [x] T001-018 [Foundation] Foco sempre visível (FR-011) `src/styles/style.css`
  - 5 `outline: none` revisados. 3 originais removidos: `.form-group input` (login/cadastro) e `.episodes-season-select` venciam o `*:focus-visible` (especificidade/ordem) e ficavam só com borda de 1px; `.input-dark` só funcionava pela posição no arquivo.
  - Mantidos 2 intencionais com substituto: container do diálogo (não interativo) e título do card "Em Andamento" (outline vai no card via `:has()`).
  - `*:focus-visible` deixou de forçar `border-radius: 6px` — cards, abas e a pílula do perfil mudavam de forma ao receber foco.
- [x] T001-019 [US2] Login e onboarding prendem o foco (FR-041) `index.html` `legacy/script.js` `src/styles/style.css`
  - `.login-box` e `.onboarding-card` com `role="dialog"`, `aria-modal`, `aria-labelledby` (`login-title`, `onboarding-title`).
  - `initModalA11y()` passa a observar `.login-overlay` e `.onboarding-overlay`; o login (visível pelo CSS, sem style inline) é registrado como aberto na inicialização.
  - **Regressão introduzida e corrigida no mesmo item:** chamar `onModalOpened()` antes do primeiro `await` do init dava `ReferenceError` (`openModals` em TDZ) e abortava toda a inicialização. `initModalA11y()` agora roda depois de `await checkAuth()`. Ver ERR-005 na memória.
- [x] T001-020 [US2] Aba "Criar Conta" no diálogo de login + trap respeita tabindex "roving" (complemento de FR-041/FR-002) `legacy/script.js`
  - Teste pendente do T001-019 feito: seta → aba "Criar Conta", 4 campos com `<label>`, foco não sai do diálogo.
  - **Bug achado no trap (T001-007):** ao dar a volta, o foco ia para a aba **inativa** (`tabindex="-1"`). `getFocusableIn()` passou a filtrar `tabIndex >= 0`.
- [x] T001-021 [Foundation] `transition: all` → propriedades específicas (FR-012) `src/styles/style.css` `index.html`
  - Levantamento automático das variantes de estado de cada seletor (`:hover`, `.active`, `.selected`, `.visible`, `.weak/.strong`…) + revisão manual dos estados por pai (`.result-item:hover .result-title-preview`, `#btn-*.selected .icon`).
  - 19 regras trocadas mantendo duração/curva; 2 `transition: 0.2s` (= all) inline do rodapé removidos — não havia estado para animar.
- [x] T001-022 [Foundation] Imagens: alt, dimensões, lazy e placeholder local (FR-013) `index.html` `legacy/script.js` `src/styles/style.css`
  - 10 `<img>` (1 no HTML, 9 em templates): todas com `alt` (2 faltavam; decorativas = `alt=""`, incluindo a sugestão de ator que lia o nome duas vezes), `width`/`height` do tamanho exibido, `loading="lazy"` (fundo do modal fica eager + `fetchpriority="high"`).
  - `height: auto` em `.result-item img`, `.library-item img`, `.history-item img` — sem isso o atributo `height` viraria altura fixa e venceria o `aspect-ratio: 2/3`.
  - `via.placeholder.com` (terceiro recebia uma requisição por pessoa sem foto) → `PERSON_PLACEHOLDER` (SVG em data URI).
- [x] T001-023 [US2] `confirm()`/`alert()` nativos → diálogo do app (FR-014) `index.html` `legacy/script.js` `legacy/supabase-config.js` `src/styles/style.css`
  - `confirmDialog({ title, message, confirmLabel, cancelLabel, danger })` → Promise<boolean>; modal `#modal-confirm` com `role="alertdialog"`, foco inicial em "Cancelar", Esc/clique fora = cancelar, z-index acima do login/onboarding.
  - Trocados os 7 `confirm()`: esqueci a senha, sair, deletar conta (2 etapas — o texto antigo pedia "Digite OK" sem campo para digitar), limpar histórico, limpar ignorados, limpar roleta, nova versão do SW.
  - 2 `alert()` de erro fatal do Supabase → `showFatalError()` (aviso `role="alert"` na página).
  - **Esc** passou a fechar só o diálogo do topo (antes fechava todos os modais abertos de uma vez).
  - **Bug do T001-007 corrigido:** ao fechar um diálogo empilhado, o foco ia para o container do diálogo de baixo; agora volta ao botão que abriu (se estiver nele).
- [x] T001-024 [US2] "Desfazer" nas remoções de item único (FR-015) `index.html` `legacy/script.js` `src/styles/style.css`
  - Remoção adiada (`scheduleUndoable`): o item some na hora, a gravação (Supabase/`localStorage`) só roda após 5 s ou quando outra remoção começa; "Desfazer" ou Ctrl+Z cancelam e restauram.
  - Aplicado a: ✕ da biblioteca (Quero Assistir / Já Assistidos), ✕ da roleta, ✕ dos ignorados (logado e convidado).
  - `pendingRemovals` (Set) filtrado por `renderLibrary()`/`renderBlacklist()`: o redesenho não traz o item de volta nem força a gravação da remoção seguinte (bug do próprio design, achado antes do teste).
  - Foco: quem remove pelo teclado vai para "Desfazer"; ao desfazer volta ao item; ao expirar vai para o próximo item da lista.
  - Aviso `#undo-toast` com `hidden` quando inativo (o `.toast` só sai da tela por `transform`; o botão continuaria no Tab).
- [x] T001-025 [US2] Atributos de formulário (FR-016) `index.html`
  - `name` nos 6 campos de login/cadastro; `spellcheck="false"` em email/usuário do login e cadastro e nos 2 campos de texto do perfil.
  - Campos de busca e filtros ficam sem `name` (D001-015). Senhas não precisam de `spellcheck`.

### US3 — Filtros e buscas

- [x] T001-003 [US3] `encodeURIComponent` nas buscas (FR-010) `legacy/script.js`
  - Busca de ator e busca direta.
- [x] T001-004 [US3] Ano atual nos filtros (FR-017) `index.html` `legacy/script.js`
  - Removido `max="2025"`; `initYearInputs()` define o máximo.
  - Corrigido fallback `'2025'` no ano final (sorteio e Top 10 voltavam vazios para "De 2026").
- [x] T001-006 [US3] Remover dependência do `event` global (FR-038) `index.html` `legacy/script.js`
  - `switchMode()` acha a aba pelo modo; `sortearFilme()`/`mostrarTop10()` acham o botão por id (`btn-sortear`, `btn-top10`) e ignoram cliques repetidos.

### Repositório

- [x] T001-005 [Foundation] Ajustar `.gitignore` (FR-037) `.gitignore`
  - `package-lock.json` passa a ser versionado; `.claude/settings.local.json` passa a ser ignorado.
- [x] T001-014 [Foundation] Service worker que entrega atualizações + código morto (FR-036) `sw.js` `legacy/script.js` `src/styles/style.css` `docs/`
  - **Causa raiz do B1:** a 004 subia `CACHE_NAME` a cada deploy, mas essa constante nunca era usada; os caches reais ficaram em `v2`, e o app era servido **cache-first**.
  - `CACHE_VERSION = 'v3'` gera os nomes dos caches (o `activate` apaga os antigos); arquivos do próprio app passam a **network-first** com fallback offline; imagens/fontes seguem cache-first.
  - Removido o widget Up Next do topo (113 linhas: `scheduleUpNextLoad`, `loadUpNextWidget`, `buildUpNextCard`, `renderUpNextSkeletons`) e seu CSS — retirado do HTML na 004 (CHANGELOG 004, linha 41). Mantidos `fetchAllSeasonsLocal`, funções puras e `refreshUpNextWidget` (usados pela aba "Em Andamento").
  - `legacy/script.js.backup` e `legacy/script-migrations.js` movidos para `E:\Trabalhos\O que assistir\_arquivo-legacy\` (fora do projeto, recuperáveis — escolha do usuário).
  - Docs: nota nos 3 guias históricos; lista "Arquivos do Projeto" do `FUNCIONALIDADES.md` corrigida.

### US4 — Reaproveitamentos das versões antigas

- [x] T001-008 [US4] Links IMDb / Rotten Tomatoes (FR-R1, de `temp/oqueassistirTmp.html`) `index.html` `legacy/script.js` `src/styles/style.css`
- [x] T001-009 [US4] Conquista "Madrugador" (FR-R2, de `v3/oqueassistirV3.html`) `legacy/script.js` `legacy/supabase-config.js` `src/domain/badges.js` `tests/domain/badges.test.js`
  - Usa o `watched_at` que o Supabase já gravava; `isNightOwlWatch()` = 0h–4h59 local. 5 testes novos.
- [x] T001-010 [US4] Textos de ajuda nos filtros (FR-R3, de `React/App.jsx`) `index.html` `src/styles/style.css`
- [x] T001-011 [US4] Aviso quando seção do modal falha (FR-R4, ideia de `novo/oqueassistirV2.html`) `legacy/script.js` `src/styles/style.css`
  - `showSectionError()`; corrigido bug de elenco/plataformas do título anterior ficarem na tela.

### Rodada final (2026-10-30)

- [x] T001-026 [Backlog] Banner "Instalar App" abaixo dos modais (z-index 900) e em classes (FR-039)
- [x] T001-027 [Backlog] `preconnect` para TMDB (API e imagens) (FR-020)
- [x] T001-028 [Backlog] Fonte via `<link>` + `preconnect`; `@import` removido (FR-028)
- [x] T001-029 [Backlog] `color-scheme: dark` (CSS e meta) (FR-022)
- [x] T001-030 [Backlog] `viewport-fit=cover` + `safe-area-inset` no body, toast, banner, conquista e "voltar ao topo" (FR-021)
- [x] T001-031 [Backlog] `overscroll-behavior: contain` em modais, login, onboarding, sugestões e episódios (FR-026)
- [x] T001-032 [Backlog] Alvos de 44px em telas de toque/estreitas; ícones pequenos com área ampliada; ✕ da biblioteca visível sem hover (FR-024)
- [x] T001-033 [Backlog] Controles de episódios em grade no celular, com rótulos claros ("Marcar temporada") (FR-023)
- [x] T001-034 [Backlog] Textos longos: ellipsis/`overflow-wrap`; cabeçalho não passa da tela (excedia 11px em 390px) (FR-025)
- [x] T001-035 [Backlog] Cliente único `src/api/tmdb.js` (URL, cache, erros, cancelamento) nos 18 pontos que usavam `fetch` (FR-034)
- [x] T001-036 [Backlog] `src/utils/format.js` com `Intl`: notas (8,5), contagens e plurais (FR-019)
- [x] T001-037 [Backlog] `legacy/` migrado para 13 módulos ES + `src/main.js`; espelhos trocados pelos módulos testados; lista única de conquistas (FR-032)
- [x] T001-038 [Backlog] Delegação em `src/app/actions.js`: zero handler inline e zero `.onclick` (FR-033)
- [x] T001-039 [Backlog] Estado na URL (`src/domain/urlState.js` + `src/app/urlSync.js`): modo, tipo, filtros, pessoa e título; link direto abre o título (FR-018)
- [x] T001-040 [Backlog] Estilos inline → classes (132 → 1: a largura calculada da barra de progresso) (FR-029)
- [x] T001-041 [Backlog] Só SVG como ícone: emojis removidos de filtros e botões; ✕/× e 📺 viraram SVG (FR-030)
- [x] T001-042 [Backlog] Identidade "Sala escura": base ameixa, âmbar/teal/rosa por tipo, Big Shoulders Display + Hanken Grotesk, bilhete como marca (FR-027)
- [x] T001-043 [Backlog] Bilhete de conquista, vencedor da roleta em letreiro, progresso "n de 12"; confete respeita movimento reduzido (FR-031)

- [x] T001-044 [Backlog] Regressão de T001-037: abrir por `file://` deixava todos os botões mortos. `INICIAR_SITE.bat`, `npm start` e aviso na tela (D001-020)
- [x] T001-045 [Backlog] Regressão de T001-038: "Esqueceu sua senha?" e cartazes com aparência de botão padrão; botões herdam a fonte do app
- [x] T001-046 [Backlog] Clicar em convidado durante a checagem de sessão reabria o login

- [x] T001-047 [Backlog] Ajustes pedidos pelo usuário: número do Top 10 centrado (regressão de T001-038), fonte de texto sem zero cortado, ícones de tipo e de conquista redesenhados como uma família, conquistas bloqueadas sem filtro cinza no card

Bugs herdados encontrados e corrigidos nessa rodada:
- Filtro "Até (ano)" era ignorado em séries (o `replace` só trocava o `.gte`).
- A busca de ator disparava uma requisição por letra (o debounce era recriado a cada tecla).
- Dois cliques seguidos em títulos podiam abrir o primeiro (agora vale o último).
- "Marcar série" trocava o texto do botão errado e o deixava como "Marcar todos".

---

## Dependencies

```
T001-001 … T001-005 (correções rápidas, independentes)
        |
        v
T001-006 (event global) -> T001-007 (modais)
        |
        v
T001-008 … T001-011 (reaproveitamentos)
```

---

## Related

- **Decisions:** `decisions.md`
- **Acceptance + evidências:** `acceptance.md` e pasta `evidence/`
