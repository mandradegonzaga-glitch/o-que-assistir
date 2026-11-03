# Changelog - qualidade-a11y-seguranca

All notable changes to this feature will be documented in this file.

## [2026-11-03] — publicado em `8b09a23` e `2a72f05` (site `v20`)

### Added (ingresso e compartilhar)

- "Gerar ingresso" separado de "Compartilhar", que abre um modal com as opções
- Ingresso na cor do tipo (âmbar Filme, teal Série, rosa Dorama), com sinopse, elenco e logos de onde assistir
- Celular: compartilhar do sistema com ingresso, texto e link; computador: baixa o ingresso e copia o texto, ou abre o WhatsApp Web com o ingresso copiado para colar (Ctrl/Cmd+V)
- Indicar título para amigos do app (`database/title_shares.sql`) e caixa "Indicações para você"

### Added (social e Match)

- 6 conquistas na categoria Social (Turma, Popular, Indicador, Curador, Bilheteiro, Par Perfeito)
- Match ao vivo: cada um no seu celular, ao mesmo tempo, pelo Supabase Realtime; link, código ou convite de amigo; votos só trocados quando os dois terminam
- A sala ao vivo sobrevive a recarregar a página
- Lista do Match ("Seus matches") com salvar em Quero Assistir
- Avisos de pedido, aceite, indicação e convite (dentro do app e, opcionalmente, no aparelho); `database/realtime_inbox.sql` para chegarem na hora

### Fixed / Changed

- Contador da aba Amigos anunciado ao leitor de tela; apagar indicação tem desfazer; botões ocupados não perdem o foco; conquistas dizem "desbloqueada/bloqueada"
- Linhas de campo + botão não estouram a largura no celular

### Tests

- Jest 268, banco 17, Playwright 126; Realtime simulado com `BroadcastChannel` entre duas abas (fixture `openPage`)

## [Unreleased] - 2026-10-30

### Added (amigos)

- Botão de Amigos no cabeçalho, com contador de pedidos e janela própria
- Convite de amizade por link
- Perfil do amigo com assistidos, lista, conquistas e títulos em comum
- Opção de ocultar a atividade dos amigos, aplicada no servidor

### Changed (marca)

- Mesmo bilhete âmbar com play em todas as telas
- Números das etapas maiores e com mais contraste

### Changed (rodada final — T001-026…T001-043)

- App migrado para módulos ES (`src/main.js`); `legacy/` retirado do projeto
- Eventos por delegação: nenhum handler inline
- Cliente TMDB único com cache, erros e cancelamento de pedidos obsoletos
- Nova identidade "Sala escura": cores, fontes, marca de bilhete e ícone do app
- Estilos inline trocados por classes; ícones só em SVG; emojis removidos dos filtros
- Filtros e título aberto ficam na URL; link compartilhado abre o título
- Notas e contagens no formato brasileiro (8,5)

### Added

- Bilhete de conquista, vencedor da roleta em destaque e progresso de conquistas no perfil
- `safe-area`, `color-scheme`, `overscroll-behavior`, `preconnect` e alvos de toque de 44px

### Fixed

- Banner "Instalar App" cobria o botão FECHAR
- Filtro "Até (ano)" era ignorado em séries
- Busca de ator disparava uma requisição por letra
- Dois cliques seguidos em títulos podiam abrir o primeiro
- "Marcar série" trocava o texto do botão errado
- Cabeçalho passava da tela em celulares; ✕ da biblioteca invisível em telas de toque

### Tests

- 125 → 145 testes (12 suítes); lista de conquistas unificada (D001-017)

## 2026-10-28

### Security

- `src/utils/escapeHtml.js` (+ espelho em `legacy/script.js`) — escape aplicado em 13 interpolações de `innerHTML` (roleta, busca, resultados, Up Next, histórico, blacklist, elenco, plataformas, episódios)
- Buscas de ator e direta com `encodeURIComponent`

### Fixed

- Zoom liberado no viewport; campos com 16px em telas de toque (sem zoom automático do iOS)
- Filtro "De (ano)" sem "Até": ano final era fixo em 2025 → lançamentos de 2026 não apareciam
- `switchMode()`, `sortearFilme()`, `mostrarTop10()` não dependem mais do `event` global (clique no ícone e chamadas por código funcionavam errado)
- Esc no modal de detalhes agora limpa o estado de episódios
- Elenco/plataformas do título anterior ficavam na tela quando a requisição falhava

### Added

- Modais com `role="dialog"`, `aria-modal`, foco preso, fundo `inert` e retorno de foco (`initModalA11y`)
- Botões "Ver no IMDb" e "Ver no Rotten Tomatoes" no modal (reaproveitado de `temp/`)
- Conquista "Madrugador" 🌙 usando `watch_history.watched_at` (reaproveitado de `v3/`) + 5 testes
- Textos de ajuda nos filtros "Parecido com…" e período (reaproveitado de `React/`)
- Avisos "Não foi possível carregar…" nas seções do modal
- Navegação por setas/Home/End em abas e no seletor de tipo (`initRovingGroups`) — "Série", "Dorama", "Roleta" e abas da biblioteca passam a ser alcançáveis por teclado

### Changed (acessibilidade — T001-012)

- 12 controles do HTML e 4 templates dinâmicos trocados de `div`/`span`/`article` clicáveis para `<button>` (perfil, abas, cards de tipo, pessoa selecionada, biblioteca, histórico, "Em Andamento", ✕ da roleta)
- Rótulo dos cards de tipo: `<h3>` → `<span class="card__label">`
- `aria-labelledby` corrigidos nos painéis (apontavam para ids inexistentes)
- Removidos `handleTabKey` e `handleCardKey`

### Changed (acessibilidade — T001-013)

- `aria-label` nos controles só com ícone: anterior/próximo do histórico, "×" do banner de instalação, ✕ da lista de ignorados, logos de streaming
- Símbolos/SVGs decorativos desses controles com `aria-hidden`; `rel="noopener"` nos logos

### Fixed (service worker — T001-014)

- Atualizações não chegavam a quem já tinha o app: o `CACHE_NAME` que era trocado a cada deploy nunca era usado e os arquivos eram servidos cache-first. Agora `CACHE_VERSION` gera os nomes dos caches e os arquivos do app são network-first (offline continua funcionando)

### Changed (acessibilidade — T001-015)

- `<label>` visível + `name`/`autocomplete` nos campos de perfil e troca de senha

### Changed (acessibilidade — T001-016)

- 81 SVGs decorativos com `aria-hidden="true"`; `<h1>` do login ganhou nome ("O Que Assistir?")

### Changed (formulários — T001-025)

- `name` nos campos de login e cadastro; `spellcheck="false"` em email e usuário

### Added (desfazer — T001-024)

- "Desfazer" (botão ou Ctrl+Z) por 5 s ao remover um item da biblioteca, da roleta ou da lista de ignorados

### Changed (diálogos — T001-023)

- Confirmações (sair, deletar conta, limpar listas, esqueci a senha, nova versão) agora usam um diálogo do app em vez do `confirm()` do navegador
- Erros fatais de conexão aparecem na página em vez de `alert()`
- Esc fecha só o diálogo do topo; ao fechar um diálogo empilhado o foco volta ao botão que o abriu

### Changed (imagens — T001-022)

- Todas as imagens com `alt`, `width`/`height` e `loading="lazy"` (exceto o fundo do modal, prioritário)
- Foto padrão de pessoa agora é local (SVG); o app não chama mais `via.placeholder.com`

### Changed (performance — T001-021)

- 19 `transition: all` trocados pelas propriedades que realmente mudam em cada estado

### Fixed (foco — T001-020)

- Ao dar a volta com Tab num diálogo, o foco ia para uma aba inativa; agora vai para a aba ativa

### Fixed (foco — T001-019)

- Telas de login e de boas-vindas viraram diálogos: o Tab não escapa mais para a página de trás

### Fixed (foco — T001-018)

- Campos do login/cadastro e seletor de temporada mostravam só borda de 1px ao receber foco; agora têm o outline de 2px
- Elementos não mudam mais de forma (raio) ao receber foco

### Fixed (contraste — T001-017)

- Todos os textos passam WCAG AA (4.5:1) nos temas Filme, Série e Dorama — antes havia até 1.38:1
- Texto branco sobre dourado (Série, 2.15:1) e rosa (Dorama, 3.53:1) trocado por texto escuro
- Tokens `--accent-text` / `--accent-on`; `--text-secondary/tertiary/muted` mais fortes; conquistas bloqueadas legíveis

### Fixed (texto — T001-015)

- Cadastro dizia "Mínimo 4 caracteres", mas a validação exige 6

### Removed

- Widget Up Next do topo (JS + CSS), retirado do HTML na feature 004
- `legacy/script.js.backup` e `legacy/script-migrations.js` movidos para `../_arquivo-legacy/`

### Changed

- `.gitignore`: `package-lock.json` versionado; `.claude/settings.local.json` ignorado
- Botões de sortear/Top 10 ganharam ids (`btn-sortear`, `btn-top10`) e ignoram cliques repetidos

### Tests

- 120 → 125 testes (9 suítes), todos passando
