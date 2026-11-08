# Tasks — Migration 001

**Feature:** 008-qualidade-a11y-seguranca
**Migration:** 001
**Date:** 2026-10-28
**Status:** in-progress

## Summary

Total: 81 | Completed: 75 | Pending: 0 (restam só FR-035 e FR-040, adiados por D001-010)

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

- [x] T001-048 [Backlog] Bugs da revisão geral: roleta para na fatia do vencedor; série sorteada traz temporadas; doramas aparecem na biblioteca (e contam em Maratonista); arrastar o elenco não fecha o modal; convidado recupera ignorados e histórico

- [x] T001-049 [Backlog] "Deletar conta" pela Edge Function `delete-account` (apaga o login; cascata leva os dados) — publicada e testada no real (limpeza da sessão local sem novo teste de ponta a ponta)

- [x] T001-050 [Backlog] Importar dados da versão antiga (FR-040): senhas locais apagadas em toda abertura, aviso no login, importação com consentimento e sem duplicar — testada no Supabase real

- [x] T001-051 [Backlog] "Sortear outro" no modal, sem repetir os 20 últimos sorteios
- [x] T001-052 [Backlog] Modal abre na hora; elenco, trailer, plataformas e IMDb carregam em paralelo, cada um com a própria falha
- [x] T001-053 [Backlog] Ícones PNG (72, 180, 192, 512), imagem de compartilhamento e `title` no iframe do trailer
- [x] T001-054 [Backlog] Testes de navegador com Playwright (23 cenários, Supabase e TMDB simulados): `npm run test:e2e`
- [x] T001-055 [Backlog] "Minhas plataformas" no perfil, salvo no aparelho (D001-024)
- [x] T001-056 [Backlog] Filtro por clima, com gêneros próprios para filmes e séries

- [x] T001-057 [Backlog] Plataformas: id da Apple TV corrigido (531 era Paramount+), 11 destaques, lista completa do TMDB com busca, sem lojas e canais; seta própria nos seletores

- [x] T001-058 [Backlog] Ícones das boas-vindas redesenhados; "Onde" lista os destaques de `providers.js`, com "Minhas plataformas" e atalho para escolher no perfil

- [x] T001-059 [Backlog] Roleta: roda visível quando vazia, ícones novos, orientação até ter 2 opções, sem giro duplo e roda parada no vencedor

- [x] T001-060 [Backlog] ESLint, `npm run check` e CI no GitHub Actions; código sem uso removido (`tmdbSeries.js`, `formatDate`, histórico de busca, login anônimo)
- [x] T001-062 [Backlog] Modo convidado: lista, vistos, conquistas e roleta salvas no aparelho; oferecidos à conta ao criá-la
- [x] T001-063 [Backlog] Minhas plataformas sincronizadas pelos metadados da conta (D001-025)
- [x] T001-064 [Backlog] Sequência diária, XP e 6 níveis no perfil (feature 005, D001-025)
- [x] T001-065 [Backlog] 20 conquistas em 3 categorias (feature 007), incluindo marcos de sequência
- [x] T001-066 [Backlog] Match no mesmo celular: aba própria, votos escondidos, swipe, setas e sorteio entre os matches (D001-026)
- [x] T001-067 [Backlog] Ingresso compartilhável em PNG, gerado no aparelho
- [x] T001-061 [Backlog] FR-035: função `tmdb` publicada e app usando o proxy; a chave saiu do código (ainda está no histórico do git)

- [x] T001-068 [Backlog] "Compartilhar" envia ingresso, texto e link juntos; substitui "Gerar ingresso"
- [x] T001-069 [Backlog] QR code no ingresso, lido por decodificador independente mesmo reduzido e em JPEG
- [x] T001-070 [Backlog] Match por link e email: votos no próprio link, sem conta para quem recebe, com resposta de volta
- [ ] T001-071 [Backlog] Amigos por username e convites de Match no app: código e `database/friends.sql` prontos, testados em Postgres local; SQL rodado pelo usuário em 2026-10-30; falta testar no Supabase real com duas contas (D001-028)
- [x] T001-072 [Backlog] Amigos no cabeçalho, com contador de pedidos e janela própria (D001-029)
- [x] T001-073 [Backlog] Convite de amizade por link (`?amigo=`), com confirmação, inclusive depois do login
- [x] T001-074 [Backlog] Perfil do amigo: assistidos, lista, conquistas e o que os dois querem ver (`get_friend_profile`, só amizade aceita)
- [x] T001-075 [Backlog] Opção de ocultar a atividade dos amigos, aplicada no servidor (D001-029)
- [x] T001-076 [Backlog] Mesmo bilhete âmbar com play em todo o app; números das etapas mais legíveis
- [x] T001-077 [2026-11-03] Separar "Gerar ingresso" de "Compartilhar" no modal do título
- [x] T001-078 [2026-11-03] "Compartilhar" envia as informações do título, o link e o ingresso
- [x] T001-079 [2026-11-03] Compartilhar com amigos do app, além do WhatsApp (deve exigir SQL novo, no modelo de `match_invites`)
- [x] T001-080 [2026-11-03] Ingresso na cor do tipo: âmbar Filme, teal Série, rosa Dorama
- [x] T001-081 [2026-11-03] Ingresso com sinopse cortada, 3 ou 4 nomes do elenco e onde assistir (logos só se o canvas puder exportá-los; senão, o nome da plataforma)
- [x] T001-082 [2026-11-03] Conquistas sociais: Turma, Popular, Indicador, Curador, Bilheteiro, Par Perfeito (contadores em `progress.social`)
- [x] T001-083 [2026-11-03] Revisão de UX e acessibilidade das telas novas (contador de Amigos anunciado, desfazer em indicações, foco preservado, estado das conquistas em texto)
- [x] T001-084 [2026-11-03] Match ao vivo: cada um no seu celular, por Supabase Realtime (broadcast), entrada por link, código ou amigo; votos trocados só no fim
- [x] T001-085 [2026-11-03] Sala do Match ao vivo sobrevive a recarregar (sessionStorage + `resync`)
- [x] T001-086 [2026-11-03] Lista do Match ("Seus matches"), com salvar em Quero Assistir e apagar com desfazer
- [x] T001-087 [2026-11-03] Avisos de Amigos: tempo real (`database/realtime_inbox.sql`), conferência ao voltar e a cada 2 min, notificação no aparelho
- [x] T001-088 [2026-11-03] Vercel: conferido pelo plugin que a branch de produção já é a `main` (nada a trocar)
- [x] T001-089 [2026-11-03] Progresso nas conquistas: bloqueadas com meta maior que 1 mostram "4 de 10" e uma barrinha (`goal`/`count` em `src/domain/badges.js`)
- [x] T001-090 [2026-11-03] Desafio do dia (+25 XP, rodízio de 10 missões, nunca repete o de ontem) e meta da semana (assistir 3, +50 XP), no perfil e no aviso ao entrar (`src/domain/challenges.js`)
- [x] T001-091 [2026-11-03] Indicações do dia no topo de Descobrir: um filme, uma série e um dorama, iguais para todos no mesmo dia, trocam à meia-noite (`src/domain/dailyPicks.js`, `src/app/dailyPicks.js`)
  - Ajuste pedido pelo usuário: no computador, pôsteres de 170px; mouse ou foco do teclado mostravam gêneros e sinopse por cima do pôster (`src/domain/genres.js`)
  - Segundo ajuste, ideia do usuário: a seção saiu de Descobrir e virou um painel flutuante com botão no canto, como chat de ajuda (D001-032). Abre sozinho só na primeira entrada do dia; bolinha rosa quando há indicações não vistas; cada indicação em linha com pôster, tipo, título, ano, nota, 2 gêneros e sinopse curta. "Voltar ao topo" subiu para ficar acima do botão
  - Ícone do botão trocado de claquete para brilhos (✨), a pedido: a claquete parecia "só filmes"
- [x] T001-097 [2026-11-03] Correção (achado do usuário): aviso e faixa "Instalar App" ficavam por cima do botão das indicações. Canto inferior direito reorganizado: avisos à esquerda do botão; faixa termina antes dele no computador; no celular a faixa fica embaixo e o canto sobe (altura publicada pelo `pwa.js` em `--install-banner-h`); "voltar ao topo" e conquista acima do botão. Site `v22`
- [x] T001-098 [2026-11-05] DNA do usuário no perfil (FUNCIONALIDADES #27 e parte do #63): gêneros em % (cada título vale 1, dividido entre os seus gêneros; top 5 + Outros), filmes/séries/doramas, década favorita e títulos por mês nos últimos 6 meses. Só com o histórico salvo, sem rede (`src/domain/tasteDna.js`, `src/app/tasteDna.js`). Site `v23`
- [x] T001-099 [2026-11-05] Parte 2 do DNA: horas assistidas (aprox.) e ator mais visto. Detalhes do TMDB (`append_to_response=credits`) buscados 4 por vez, só os que faltam, e guardados no aparelho em `title_facts` (filmes para sempre, séries por 30 dias); apagados ao sair da conta ou deletá-la (`src/domain/lifeStats.js`, `src/app/lifeStats.js`)
- [x] T001-100 [2026-11-05] Dois testes instáveis na suíte inteira: Match ao vivo lia o código da sala antes de aparecer (falhava até sozinho); ingresso tinha só 400 ms para ver "Gerando…" (agora 1,5 s)
- [x] T001-101 [2026-11-05] DNA: "Outros" sem barra, numa linha separada, com os gêneros que entraram nele ("Ação, Animação, Aventura, Comédia, Família e mais 2"); aprovado pelo usuário
- [x] T001-092 [2026-11-06] Comparar gostos no perfil do amigo (FUNCIONALIDADES #16 e #54): "58% · Alguns gostos em comum", gêneros que os dois curtem, quem assiste mais o quê e "Vocês dois já assistiram". A porcentagem é a interseção das duas distribuições de gênero (a mesma conta do DNA), igual dos dois lados; a partir de 3 títulos com gênero de cada um (`src/domain/tasteMatch.js`). SQL: `get_friend_profile` passa a enviar `genres` do histórico; sem ele, a porcentagem some e os títulos em comum continuam. Rodado no Supabase em 2026-11-06 pelo MCP (migração `friend_profile_history_genres`)
- [x] T001-103 [2026-11-06] Correção (achado do usuário, com print): uma ponta do aviso (toast) escondido ficava na borda direita. Desde o botão ✨ o aviso fica a 92px da borda, e o deslocamento fixo de 400px não bastava para avisos compridos ou telas de ~450px. Agora sai a própria largura + o espaço até a borda e fica invisível ao terminar de sair ("Desfazer" continua visível: recebe o foco antes de entrar)
- [x] T001-102 [2026-11-06] Teste de convidado dependia da hora: de madrugada a conquista "Madrugador" aparecia antes de "Iniciante" (relógio fixado ao meio-dia)
- [x] T001-093 [2026-11-06] Reações rápidas: "Como foi?" no título já assistido (🔥 Amei, 😢 Chorei, 😂 Ri muito, 🤯 Explodiu minha cabeça; tocar de novo tira). "Já vi" agora deixa o título aberto, com o foco na primeira reação. Reações em 4 blocos iguais (emoji em cima, nome embaixo), ajuste pedido pelo usuário: em pílulas, "Explodiu minha cabeça" caía sozinho na 2ª linha. Selo no pôster em "Já assistidos" e no perfil do amigo. Convidado guarda no aparelho; conta, na coluna `reaction` do histórico, pela função `set_title_reaction` (`database/reactions.sql`; o histórico continua sem permissão de UPDATE). Rodado no Supabase pelo MCP (migração `title_reactions`), sem mostrar antes, como o usuário autorizou
- [x] T001-104 [2026-11-06] Lançamentos e estreias (FUNCIONALIDADES #20): botão "Lançamentos" ao lado do Top 10. Filme: o que chegou ao digital no Brasil nos últimos 45 dias (`release_date` + `with_release_type=4` + `region=BR`); série e dorama: estreias dos últimos 60 dias. Vale com gênero, clima, plataforma, pessoa e país; os anos não contam. Legenda acima dos pôsteres; títulos sem letra latina (sem nome em português) ficam de fora. "Sortear Agora" passou a ocupar a linha inteira
- [x] T001-105 [2026-11-06] Surpreenda-me (#19): gênero que a pessoa menos vê (pelos pesos do DNA; em série, Ação+Aventura somam), só bem avaliados (filme ★7+ e 300 votos; série ★7,5+ e 150; dorama ★7,5+ e 30), com plataforma e país. Gênero sem resultado → o próximo menos visto (até 4). Aviso "Fora da sua zona de conforto: Faroeste". Sem filme de TV, notícias, reality, talk show, novela e infantil
- [x] T001-106 [2026-11-06] Sessão às escuras (#43): sorteio com os filtros, mostrando só sinopse, nota, duração, década e 2 gêneros; o título (e a parte antes de ":" ou " - ") vira "[título]" na sinopse. "Arriscar e revelar" abre o título; "Outro às escuras" troca sem fechar. Só títulos com sinopse de 60+ letras
- [x] T001-107 [2026-11-06] Filtro por país (#21): 15 países ao lado da duração; vale em sorteio, Top 10, lançamentos, Surpreenda-me, às escuras e batalha; fica no link (`?pais=JP`). Em Dorama fica desligado, com aviso
- [x] T001-108 [2026-11-06] Cine-batalha (#55): 8 títulos dos filtros (sem os vistos e bloqueados), em mata-mata: quartas, semifinal e final (7 escolhas; com 4 a 7 títulos, batalha de 4). Campeão abre como sorteio. Ajuste visto no teste real: os dois cartões com a mesma altura
- [x] T001-109 [2026-11-06] Efeito 3D nos pôsteres (#45): resultados e biblioteca inclinam até 8° seguindo o mouse, com brilho; código próprio (`src/ui/tilt.js`), sem biblioteca. Só com mouse e sem "reduzir movimento"
- [x] T001-110 [2026-11-06] Sorteio comum também evita o que a pessoa já viu (se só sobrar isso, repete); `pickDraw` e `withDetails` reaproveitados pelos modos novos
- [x] T001-111 [2026-11-06] Guia "Como usar" (pedido do usuário: "não fica especificado" como usar, ex.: escolher o gênero da Cine-batalha). 12 tópicos que abrem e fecham (`<details>`), com os nomes de botão iguais aos da tela. Abre pelo ? do topo (some abaixo de 440px), pelo "Como usar" do rodapé e pelos "Como funcionam?" / "Como funciona?" ao lado dos Filtros Inteligentes e de "Outros jeitos de escolher", que abrem direto no tópico (`src/app/help.js`). 4º passo nas boas-vindas aponta para o guia. Batalha e Sessão às escuras mostram os filtros que estão valendo ("Filtros: Filmes · Terror · Japão · desde 1990")
- [x] T001-112 [2026-11-06] Correção achada no caminho: no celular o avatar do topo ficava espremido (~6px em vez de 36px). Agora não encolhe, e o logo diminui com a tela (até 480px), perdendo o bilhete até 350px. Teste mede 320 a 480px: sem rolagem lateral, avatar com 36px e logo sem corte
- [x] T001-113 [2026-11-06] Cine-batalha: sinopse no pôster (ideia do usuário). Com mouse, aparece ao passar por cima (e com o foco do teclado); no toque, pelo botão "Sinopse" embaixo de cada pôster, que mostra e esconde sem votar. Tocar no pôster continua votando. A sinopse é a descrição do botão de voto (aria-describedby); o botão "Sinopse" some quando há mouse. No guia "Como usar" também
- [x] T001-114 [2026-11-06] Cine-batalha, achados do usuário com prints: (1) "a barra não acompanha": ela contava os 7 duelos do torneio e o texto, só a fase (no "4 de 4" das quartas a barra estava em 3/7); (2) "todas as etapas vêm quartas de final": nada mostrava que havia outras fases. A lógica estava certa (conferido com o TMDB real: a fase muda para Semifinal no 5º duelo). Troquei a barra por uma trilha por fase (Quartas 4 marcas, Semi 2, Final 1; feito, atual e o que falta; fase atual em destaque) e o texto virou "Quartas de final · duelo 4 de 4" (`stageTrack` em src/domain/battle.js). Mais "Voltar" (pedido dele): desfaz um voto por vez, entre fases e depois do campeão, até o começo; o foco volta ao primeiro pôster e a fase é anunciada; "Nova batalha" zera
- [x] T001-115 [2026-11-06] Séries, achado do usuário: "não conseguimos marcar como gostei e não está aparecendo a parte de temporadas e episódios". Causa: (1) a seção de episódios só aparecia com conta; o convidado não via nada; (2) em série o "Já Vi" ficava travado em "Assistindo" até marcar todos os episódios, então o "Como foi?" (que depende de "Já assistidos") nunca aparecia, com conta ou sem. Com conta, as temporadas apareciam (tabela `episode_progress` e RLS conferidas no Supabase). Correção, aprovada por ele ("faça o recomendado; convidado igual ao logado"): "Já Vi" sempre ativo em série (marca a série, abre o "Como foi?", tira de Quero Assistir e de Em Andamento); terminar os episódios continua marcando sozinho; convidado marca temporadas e episódios salvos no aparelho (`guest_episodes`, novo `src/app/episodeStore.js` com a mesma interface para conta e convidado) e tem Em Andamento; desmarcar a série atualiza "Já assistidos" e esconde o "Como foi?" (antes ficava aberto, também com conta). Guia "Como usar" atualizado. Service worker `v24`.
- [x] T001-116 [2026-11-06] Séries, pedido do usuário: "quando marcar o 'já vi' ele automaticamente deveria marcar todas as temporadas". "Já Vi" numa série (e dorama) marca todos os episódios de todas as temporadas (sem a 0, de especiais) num pedido só (`supabaseMarkEpisodesWatched`, upsert com `ignoreDuplicates` na chave única); "Marcar temporada" e "Marcar série" também passaram a gravar de uma vez (antes, um pedido por episódio). Achados e corrigidos: (1) dorama aberto pela biblioteca, link ou histórico virava "tv" (`carregarDetalhes`), e o "Já Vi" o mandaria para Séries; (2) depois de "Marcar série" os nomes dos episódios sumiam (o cache das temporadas guardava só os números).
- [x] T001-117 [2026-11-06] Episódios, recomendação aceita pelo usuário ("sim"): (1) saiu o botão "Marcar série" (o "Já Vi" faz o mesmo); no celular, Marcar/Desmarcar temporada lado a lado e Desmarcar série embaixo; (2) "Vi até aqui" em cada episódio: marca ele e todos os anteriores, inclusive temporadas passadas, num pedido só, sem desmarcar os seguintes; com mouse aparece ao passar por cima ou com o foco, no toque fica sempre visível; o foco volta ao mesmo botão depois de redesenhar. A linha do episódio virou `div` com `label` (check) + botão, porque botão dentro de `label` marcaria o check.
- [x] T001-118 [2026-11-06] Episódios do convidado vão para a conta (aprovado: "sim"). Entram na mesma pergunta "Trazer sua lista para a conta?" ("… e o progresso de 2 séries"), gravados de uma vez em `episode_progress` (upsert com `ignoreDuplicates`: o que a conta já tinha fica igual); `guest_episodes` só é apagado depois de o banco confirmar; falha ou "Agora não" mantêm no aparelho. Regras puras em `normalizeEpisodes` (src/domain/legacyData.js): chave fora do formato, de outra série ou repetida é descartada; dorama continua dorama.
- [x] T001-119 [2026-11-06] CI do GitHub em vermelho desde 2026-11-03 (pergunta do usuário: "porque meu github está com erros?"). Lint, Jest e banco passavam; falhava 1 de 192 testes de navegador, alternando entre `liveMatch.spec.js` "sala que não existe" (adiantava 16 s antes de a sala conectar e mandar o "oi", que é quando o prazo de 15 s começa) e `dailyPicks.spec.js` "no celular, o painel cabe na tela" (media o painel durante a animação de entrada, que o desce 12px). Correção só nos testes: esperar o "oi" em `window.__liveSent` antes de adiantar o relógio, e esperar `getAnimations().finished` antes de medir. Conferido: os dois testes 20× com 12 workers, `npm run check` (Jest 396, e2e 192). App não mudou.
- [x] T001-120 [2026-11-06] Listas personalizadas, parte 1 (FUNCIONALIDADES #25, decisão D001-041). Aba "Minhas Listas" na Biblioteca (cartões com emoji, nome, contagem e últimos pôsteres; dentro: Renomear, Apagar lista com confirmação e ✕ com desfazer), botão "Salvar em uma lista" no título (vira "Em N listas") com a janela de marcar várias e "+ Nova lista" (cria e já guarda o título), janela de nome + 16 emojis (radiogroup com setas). Convidado guarda em `guest_lists` e leva para a conta na pergunta de importação (lista com o mesmo nome recebe os títulos). Banco: `database/user_lists.sql` (RLS, nome único por pessoa sem diferenciar maiúsculas, até 40 letras, 50 listas e 500 títulos por lista por gatilho, pôster só do TMDB), aplicado no Supabase pelo MCP (migrações `user_lists` e `user_lists_limit_revoke`, esta tirando da API a função do gatilho, apontada pelo verificador de segurança). Achado durante os testes e corrigido: Enter num campo com `data-enter` acionava também o botão que recebia o foco depois (`e.preventDefault()` em `actions.js`). Novos: `src/domain/userLists.js`, `src/app/userLists.js`, tópico "Minhas Listas" no guia (13 tópicos), SW `v25`. Testes: Jest 407, banco 23 (novo `tests/database/userLists.test.mjs`), e2e 197 (novo `userLists.spec.js`). Conferido em prints a 320, 390 e 1280px. Parte 2 (ordem arrastando e link público) fica para depois.
- [x] T001-121 [2026-11-06] Pré-listas, a pedido do usuário ("poderia ter algumas pré listas já feitas"; escolheu "as duas"). Modelos com um toque (`LIST_TEMPLATES`: Favoritos, Maratona de Halloween, Com o mozão, Com a família, Sexta à noite, Pra rir): na aba vazia criam a lista; na janela "Nova lista" preenchem nome e emoji; somem quando a pessoa já tem uma com o mesmo nome. Coleções prontas (`src/domain/collections.js`, 8: Clássicos do terror, Romances para chorar, Animações para a família, Comédias para rir, Ficção científica, Filmes mais bem avaliados, Séries imperdíveis, Doramas queridinhos), no fim da aba "Minhas Listas": buscam no TMDB os mais bem avaliados do tema (cache de 24 h), mostram os pôsteres e "Copiar para minhas listas" cria a lista (ou completa a de mesmo nome) com gravação em lote (`supabaseAddListItems`). Conferidas no TMDB real; filtros ajustados porque vinham títulos fora do tema (Poderoso Chefão em "chorar", Pulp Fiction em comédia, Run BTS! em dorama, animações em terror/ficção). Jest 411, banco 23, e2e 200. Sem SQL novo.
- [x] T001-122 [2026-11-06] Listas personalizadas, parte 2 (pedido "faça a parte 2 das listas"). **Ordem:** botão "Ordenar" na lista aberta liga o modo de ordenar: arrastar só pela alça "⠿ Arrastar" (Pointer Events, mouse e dedo; no resto do pôster o dedo rola a página), e botões ◀ ▶ em cada pôster para teclado e leitor de tela (o foco acompanha o título; aviso falado "X agora é o 2º de 5"). Grava sozinha 600 ms depois do último movimento: convidado no aparelho; conta pela função `reorder_list_items` (SECURITY INVOKER, coluna `position`). Se o banco falhar, avisa e volta à ordem anterior. **Link público:** "Compartilhar" (só com conta) pede confirmação dizendo o que fica visível (nome da lista, títulos e o nome da pessoa), cria o token (`set_list_sharing`) e manda o link `?lista=<token>` (WhatsApp/apps no celular, copiar no computador); "Parar de compartilhar" desliga o link. Quem abre o link, mesmo sem conta (depois de entrar como convidado), vê a lista na ordem em uma janela (`get_shared_list`, aberta a todos mas só pelo token) e pode "Copiar para minhas listas"; o próprio link leva direto à lista para editar. Banco: parte 2 de `database/user_lists.sql`, aplicada pelo MCP (migração `user_lists_part2_order_share`); os 2 avisos novos do verificador são intencionais (`get_shared_list` pública por token; `set_list_sharing` confere `auth.uid()`). Achado e corrigido nos testes: `renderLibrary` atrasada desenhava a aba antiga por cima da nova (ex.: "Nenhum item assistido" na aba Minhas Listas); agora só vale a chamada mais recente, também em Em Andamento. Novos: `src/ui/dragReorder.js`, `src/app/listShare.js`, `tests/e2e/userListsShare.spec.js`. SW `v26`. Jest 415, banco 25, e2e 208.
- [ ] T001-094 ⏸️ [Em espera, pedido do usuário em 2026-11-03] Ranking entre amigos por XP do mês (precisa guardar o XP no servidor)
- [ ] T001-095 ⏸️ [Em espera, pedido do usuário em 2026-11-03] Aviso "sua sequência vai acabar" com o app fechado (precisa de push pelo servidor)
- [x] T001-096 [2026-11-06] Indicações do dia pelo DNA de cada perfil, em vez de iguais para todos (`pickProfile`, `usableGenres`, `personalRequest` em `src/domain/dailyPicks.js`). Cartão sob medida diz "Porque você curte Terror" e o gênero vem primeiro na linha de gêneros; o painel diz "Escolhidos pelo seu gosto". Rodízio diário entre até 3 gêneros, só os que pesam pelo menos metade do favorito (ajuste meu, visto no teste real: quem via quase só terror ganhava suspense dia sim, dia não). Página do dia entre as 3 primeiras; vazia → página 1; ainda nada → padrão. Combinado com o usuário em 2026-11-06:
  - Com pelo menos 5 títulos com gênero (o mesmo limite em que o DNA deixa de estar "se formando"), os 3 cartões (filme, série, dorama) puxam os gêneros que a pessoa mais assiste; continuam só títulos bem avaliados, mudam a cada dia e deixam de fora o que ela já viu
  - Com menos de 5: as indicações de hoje, iguais para todo mundo
  - O DNA não separa por tipo: quem só viu filmes também recebe série e dorama pelos gêneros dos filmes (o usuário perguntou e aprovou). Gêneros de filme viram os de série (Ação/Aventura → 10759, Ficção científica/Fantasia → 10765, Guerra → 10768); os que não existem em série (Terror, Romance, Suspense…) são pulados e vale o próximo gênero da pessoa; nenhum serve → aquele cartão volta para o padrão
  - TMDB sem resultado para os gêneros naquele dia → aquele cartão volta para o padrão (nunca fica vazio)
  - Vale para conta e convidado (o DNA usa o histórico salvo)

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

- [x] T001-123 [2026-11-06] Backup antes do redesign (pedido do usuário: "acho uma boa criar um backup"). Etiqueta `backup-antes-redesign` e branch `backup/antes-redesign` no commit `3c0d797` (a produção, SW `v26`), enviadas ao GitHub. Para voltar: `git checkout backup-antes-redesign` ou promover de novo o deploy antigo na Vercel.
- [x] T001-124 [2026-11-06/07] Redesign, etapa 1 (D001-042), branch `redesign/etapa-1`, commit `f896607`. **Ícones:** todos os 91 SVGs desenhados à mão e os 73 emojis de interface viraram Phosphor Icons (MIT, `@phosphor-icons/core` como devDependency). `scripts/build-icons.mjs` gera `src/ui/phosphor.js` só com os ícones usados (`ph(nome, { weight, cls })` e `hydrateIcons()` para `<span data-ph>` no HTML). Regra de peso: duotone nos destaques, regular na interface, bold até 16 px, fill no estado ativo. Roleta é desenho próprio no mesmo padrão (`scripts/icons-custom/roulette*.svg`: aro, 6 gomos, marcador), porque o Phosphor não tem roleta (o `steering-wheel` parecia volante, achado do usuário). Ficam fora a marca (ingresso) e o QR. Ícones seguem a cor do tipo escolhido (`--accent-text`; achado do usuário com Série em verde-água). Boas-vindas: o 1º passo mantém o ingresso da marca (pedido do usuário). **Listas:** ícone colorido no lugar do emoji (`src/ui/listIcons.js`); o banco continua guardando o emoji, sem migração; seletor "Ícone" com nome para leitor de tela. **Título:** linha única com nota, ano, duração ou temporadas, e os gêneros em português na linha de baixo (`src/domain/titleFacts.js`, detalhes via `/{tipo}/{id}`). **Toques de app:** afundar ao tocar (só tela de toque, respeita menos movimento), sem seleção acidental em botões, sem "elástico" instalado. **Pôsteres:** mesmo arredondamento, fio claro e fundo enquanto carrega. **Defeito antigo achado pelos testes:** um aviso de conquista apagava o outro que chegava junto (ex.: Par Perfeito + desafio do dia "Dê um match"); agora há fila em `src/ui/feedback.js`, conquista primeiro. SW `v27`. Jest 423, e2e 208.
- [x] T001-125 [2026-11-07] Redesign, etapa 2 (D001-042), branch `redesign/etapa-2`, commits `9c9ac09`, `640a7b0`, `8d605c9`. Página do título: fundo com o pôster desfocado (`#m-ambient`); ações principais em ícones (`.title-action`: Já vi fica verde quando marcado, Salvar acende com marcador preenchido, Roleta acende como "Na roleta"); "Onde assistir" logo abaixo; abas Sobre / Elenco / Episódios / Parecidos que grudam no alto e ROLAM até a parte (não escondem nada: quem rola vê tudo e os testes antigos seguem valendo); a aba marcada acompanha a rolagem e o toque nela tem prioridade até a rolagem parar (defeito achado pelo teste novo). "Parecidos" com `/recommendations` (até 10; sem nenhum, aba e seção somem). Ingresso, Compartilhar e Ignorar em pílulas no fim. Esqueletos no elenco, onde assistir e parecidos (texto só para leitor de tela). **Achados do usuário:** (1) Roleta no título levava direto para a roleta: agora põe/tira sem sair e mostra aviso "Ir para a roleta"; (2) o trailer aparecia através e acima das abas: faixa opaca e cobrindo o respiro do alto da janela. Novo: `tests/e2e/titlePage.spec.js`. SW `v28`. Jest 423, e2e 212. A suíte inteira às vezes falha 1 teste de tempo diferente por rodada com a máquina carregada (ingresso, login simulado, sala ao vivo); todos passam sozinhos.
- [x] T001-126 [2026-11-07] Redesign, pós-etapa 2 (pedidos do usuário), branch `redesign/etapa-2`. **(1) Barra de rolagem de "Parecidos"** igual à do Elenco (fina, sem setas): `.similar-list` tinha `scrollbar-width: thin` sem `scrollbar-color`, e o Chrome no Windows volta à barra padrão (grossa, setas, trilho cinza); agora usa a mesma cor e as mesmas regras `::-webkit-scrollbar` da `.cast-list`. Conferidas as outras fileiras horizontais: só as abas (barra escondida) e o Elenco, ambos certos. **(2) "Nos cinemas" / "Estreia nos cinemas em DD/MM"** no "Onde assistir" quando o filme não tem streaming (D001-043): `src/domain/cinemaRelease.js` lê `release_dates` do Brasil (tipo 3, ou 2 se não houver); estreia futura → data (com ano se for outro ano); estreou há até 75 dias e sem digital/físico/TV já lançado no Brasil → "Nos cinemas"; senão segue "Indisponível em streaming". Os detalhes do filme vêm num pedido só (`/movie/{id}?append_to_response=release_dates`), compartilhado pela linha de informações e pelo "Onde assistir"; séries não pedem datas. Pílula `.cinema-note` com pipoca (Phosphor duotone). TMDB real: *Vingadores: Doutor Destino* "Estreia nos cinemas em 16/12"; *Godzilla Minus Zero* "Nos cinemas". **(3) Ingresso novo: NÃO feito** — o usuário escolheu captação no Dribbble só para o ingresso, mas a extensão do Claude no Chrome não estava conectada; fica para a próxima sessão. SW `v29`. Novos: `tests/domain/cinemaRelease.test.js` (9) e 3 e2e em `tests/e2e/titlePage.spec.js`. Jest 432, banco 25, e2e 215 (na suíte inteira falhou 1 vez o teste de tempo do ingresso, conhecido; sozinho passou 3 de 3). **Sem commit** (pausa a pedido).
- [x] T001-127 [2026-11-07] Redesign: **ingresso novo** ("Gerar ingresso", `src/app/ticket.js`), branch `redesign/etapa-2`. Captação no Dribbble (Vera "Vintage Movie Ticket" 27620653, Purrweb "Movie ticket app" 21083441, "Lowlight Jazz Session"); o usuário escolheu "Pôster em destaque". Ingresso escuro com o pôster desfocado ao fundo; topo grande com a imagem do título, selo "HOJE É DIA DE" na cor do tipo e o nome em até 2 linhas (3 ao lado do pôster), com fonte que diminui, linhas equilibradas e artigos curtos (A, O, DE, DO...) presos à palavra seguinte; grade Tipo · Ano · Nota · Duração (série/dorama: Temporadas), com a duração vinda dos detalhes (mesmo pedido do modal, em cache); sinopse no espaço que sobra (até 6 linhas), "Com" + elenco, "Onde assistir" com logos; picote com recortes; canhoto com "O QUE ASSISTIR?" na cor do tipo e QR em cartão branco. **Imagem do topo em cadeia (D001-044):** paisagem (da lista ou dos detalhes) → só pôster: pôster inteiro à direita, sem corte, sobre ele mesmo desfocado → série/dorama sem imagem: cena de episódio da 1ª temporada (`/tv/{id}/season/1`) → mosaico de 3-4 fotos do elenco → topo menor com degradê e ícone Phosphor do tipo (claquete/TV). SW `v30`. Testes: cor por tipo agora conta pixels no ingresso inteiro; +2 e2e em `share.spec.js` (cena antes do elenco; série sem imagem busca a cena). Jest 432, e2e 217.
- [x] T001-128 [2026-11-07] Redesign **etapa 3** (navegação), branch `redesign/etapa-3` (D001-045). Captação no Dribbble: Sollas (barra em pílula), JuicyBox/ScreensLab 27605212 (barra com nomes; biblioteca em seções), Stake/Kretya 21176531 (início em fileiras com "Ver tudo"), Overcast (botão central). **Celular:** barra flutuante `nav.bottom-nav` (só até 640px) com Início · Roleta · **Sortear** (centro, ingresso na cor do tipo, chama `sortearFilme` de qualquer tela) · Match · Biblioteca; 5 colunas iguais com o nome embaixo de todos os ícones (o "só o ativo mostra o nome" tirava o Sortear do centro); ativo com ícone cheio e `aria-current="page"`; as abas do topo somem no celular e o body reserva o espaço da barra. **Computador:** abas do topo Início (era "Descobrir") · Roleta · Match · Biblioteca. **Biblioteca** em tela própria (`#view-library`, `modo=library` na URL, `showUserList` leva até ela). **Início:** "Continue assistindo" (`src/app/homeRows.js`, cartões deitados com próximo episódio e progresso; "Ver tudo" abre Em Andamento; `loadSeriesInProgress()` em library.js, compartilhado com Em Andamento); depois tipo, filtros, Sortear, "Outros jeitos", busca e resultados; **Indicações do dia** por último (painel flutuante e botão ✨ removidos): 3 colunas no celular, 3 cartões deitados com trecho da sinopse no computador. Top 10/Lançamentos/busca: 5 por linha no computador e 2 no celular. Títulos das fileiras no estilo de "Outros jeitos". Canto inferior direito refeito sem o ✨ (`--floor`, `--nav-room`: tudo acima da barra no celular). Ícones novos: house, books, heart (cheio). Guia "Como usar" atualizado. SW `v31` (+`homeRows.js`). Testes: auxiliares `openLibrary`/`openLibraryTab` em `tests/e2e/support/app.js`; `dailyPicks.spec.js` reescrito para a fileira; canto com a barra; novo `navigation.spec.js` (7). Jest 432, e2e 223.

## Related

- **Decisions:** `decisions.md`
- **Acceptance + evidências:** `acceptance.md` e pasta `evidence/`
