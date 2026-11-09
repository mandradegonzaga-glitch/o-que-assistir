# Implementation Progress

> Feature: 008-qualidade-a11y-seguranca
> Last Updated: 2026-11-07 (redesign, etapas 1 e 2)
> Branch: `004-series-tracking` (D001-001). Todo push nesta branch publica o site na Vercel.

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

**REDESIGN EM ANDAMENTO (D001-042): ler isto primeiro (atualizado em 2026-11-07):**
- **Onde está:** branches `redesign/etapa-1` (`f896607`), `redesign/etapa-2` (inclui a 1) e `redesign/etapa-3` (`6c4184b`, inclui a 2), no GitHub. **A etapa 4 está em `redesign/etapa-4` (`13f9950`), com o acabamento das etapas 1 a 4 (T001-130, D001-047) as pílulas de tipo (T001-131) e os títulos em proporção (T001-132) por cima, 2026-11-08. Prints dos testes saem sem a fonte real (Google Fonts bloqueado): para conferir o visual, `page.unroute('**/fonts.googleapis.com/**')`. Etapa 5 em `redesign/etapa-5`, em partes com aprovação a cada uma (decidido em 2026-11-08): 5a gavetas FEITA (T001-133); próximo 5b sorteio em baralho de ingressos, depois 5c Match + Deu Match!, 5d Perfil de gosto em cartão-ingresso + primeira visita, 5e reações ilustradas (Gemini, mostrar antes).** **A produção continua no `3c0d797` (SW `v26`) e só será publicada quando as 5 etapas estiverem prontas.**
- **Backup:** etiqueta `backup-antes-redesign` e branch `backup/antes-redesign` (T001-123).
- **Feito:** etapa 1 (T001-124: ícones Phosphor, linha única do título, toques de app, pôsteres), etapa 2 (T001-125: página do título) etapa 3 (T001-128, D001-045: barra de baixo no celular, Biblioteca própria, Início com "Continue assistindo", indicações no fim) e etapa 4 (T001-129, D001-046: filtros em pílulas e recolhíveis, Natal, busca no alto, Top 10/Lançamentos que fecham).
- **Próxima sessão, pedidos do usuário em 2026-11-07:**
  1. ✅ Feito em 2026-11-07 (T001-126, D001-043): barra de "Parecidos" igual à do Elenco e "Nos cinemas" / "Estreia nos cinemas em DD/MM". SW `v29`.
  2. ✅ Feito em 2026-11-07 (T001-127, D001-044): ingresso novo ("Pôster em destaque") com a imagem do topo em cadeia. SW `v30`.
  3. ✅ Etapas 3 e 4 feitas (T001-128, SW `v31`; T001-129, SW `v33`, sem commit).
  3b. ✅ Acabamento das etapas 1 a 4 (T001-130, SW `v34`) pelas skills do Emil Kowalski, instaladas como globais (emil-design-eng, animate, review-animations, choreograph, gestures, mobile-native, break-ui): **usar na etapa 5** (gestures no Match de arrastar e nas gavetas, choreograph no sorteio e no Deu Match!, review-animations no fim; `--ease-drawer` já existe). Falta conferir num celular de verdade o toque e o hover.
  4. ✅ Feito em 2026-11-08 (T001-131, SW `v35`). Era: **Próximo, já aprovado pelo usuário (prévia em 2026-11-07):** Filme, Série e Dorama em **3 pílulas numa fileira** no lugar das 3 caixas grandes (`.options-grid .card`): pílulas de 52px de altura, ícone de 22px + nome, as 3 em colunas iguais (largura toda também no computador), a escolhida preenchida na cor do tipo (`--accent-primary`, texto `--accent-on`), as outras com fundo `--bg-card` e o ícone na própria cor. Tirar a animação de entrada `stagger-fade-in` (começa com opacidade 0). Manter role="radio", setas e ids `btn-movie/tv/dorama`. Ganho: no celular, busca, tipo, filtros recolhidos e SORTEAR AGORA cabem na primeira tela. Depois: commit da etapa 4 e **etapa 5** (captação no Dribbble antes).
- **Pendências de antes do redesign só DEPOIS do redesign inteiro** (decisão do usuário em 2026-11-07): ilustrações do vídeo, vídeo final, teste com 2 celulares.
- **Ícones:** para acrescentar um, pôr o nome e o peso em `ICONS` de `scripts/build-icons.mjs` e rodar `node scripts/build-icons.mjs`.
- **Testes:** a suíte e2e inteira às vezes falha 1 teste de tempo diferente por rodada com a máquina carregada; rodar o que falhou sozinho antes de concluir que quebrou algo.
- **Pendências de antes do redesign:** refazer as 2 ilustrações com defeito do vídeo (casal com dois braços esquerdos, amigos com pernas estranhas) e mostrar ao usuário antes de usar; vídeo final com Remotion (`Divulgacao/video-remotion`, só depois do redesign); teste real com 2 celulares.


**Ao reabrir (anotado em 2026-11-06):**
1. ✅ Feito em 2026-11-06 pelo MCP (migração `friend_profile_history_genres`; conferido: a função traz `genres`, anon sem acesso, authenticated com acesso). Antes: **Rodar no Supabase o `get_friend_profile` novo** (`database/friends.sql`, agora com `genres` no histórico), pelo MCP do Supabase: o usuário pediu para eu rodar ("rode você o sql"). Nesta sessão as ferramentas do MCP não carregaram (conectado, mas aberto antes); depois de rodar, conferir que o perfil de um amigo traz `genres`.
2. ✅ Feito em 2026-11-06 (T001-096, sem commit). Era: **Depois, T001-096 (indicações pelo DNA)**, já aprovado. Combinado com o usuário em 2026-11-06:
  - Com pelo menos 5 títulos com gênero (o mesmo limite em que o DNA deixa de estar "se formando"), os 3 cartões (filme, série, dorama) puxam os gêneros que a pessoa mais assiste; continuam só títulos bem avaliados, mudam a cada dia e deixam de fora o que ela já viu
  - Com menos de 5: as indicações de hoje, iguais para todo mundo
  - O DNA não separa por tipo: quem só viu filmes também recebe série e dorama pelos gêneros dos filmes (o usuário perguntou e aprovou). Gêneros de filme viram os de série (Ação/Aventura → 10759, Ficção científica/Fantasia → 10765, Guerra → 10768); os que não existem em série (Terror, Romance, Suspense…) são pulados e vale o próximo gênero da pessoa; nenhum serve → aquele cartão volta para o padrão
  - TMDB sem resultado para os gêneros naquele dia → aquele cartão volta para o padrão (nunca fica vazio)
  - Vale para conta e convidado (o DNA usa o histórico salvo)
2b. ✅ Reações rápidas (T001-093) feitas em 2026-11-06, SQL rodado no Supabase. Ordem combinada concluída: próximo é o usuário escolher as ideias extras.
2c. ✅ Extras feitos em 2026-11-06 (T001-104 a 110): lançamentos, Surpreenda-me, Sessão às escuras, filtro por país, Cine-batalha, efeito 3D. Listas personalizadas ficaram para depois, a pedido do usuário.
2d. ✅ Guia "Como usar" (T001-111) e avatar do topo no celular (T001-112), em 2026-11-06. Ao criar funcionalidade nova, incluir no guia (`#modal-help` em index.html).
3. Publicado em 2026-11-06 (site `v23`): commits de código, docs e ferramentas enviados para `004-series-tracking` e `main`; produção na Vercel. O MCP do Supabase (`.mcp.json`) e as skills do Supabase entraram no repositório.
3b. Publicado em 2026-11-06 (site `v24`): séries corrigidas (T001-115 a T001-118, commits `c60db74` e `0b7bdba`). "Já Vi" em série/dorama marca todas as temporadas e abre o "Como foi?"; "Vi até aqui" em cada episódio (saiu "Marcar série"); convidado com episódios igual à conta, levados para a conta ao entrar. Não testado com conta real (só Supabase simulado no e2e): conferir no teste com celulares.
3c. **Ao retomar (pedido em 2026-11-06):** perguntar qual seguir: listas personalizadas (#25, SQL), vídeo final, ou o teste real com dois celulares (incluir séries logado: "Já Vi", "Vi até aqui", Em Andamento, importação do convidado). Em espera (servidor): T001-094 e T001-095.
3d. **MCPs (2026-11-06):** varredura completa de mcpservers.org (19.521 servidores, 583 ligados ao projeto). Adicionados ao `.mcp.json` só oficiais: `context7` (documentação atual das bibliotecas), `github` (CI e logs; precisa da variável `GITHUB_PAT` com um token fine-grained só deste repositório, leitura em Actions/Contents/Pull requests, criado pelo usuário) e `chrome-devtools` (Lighthouse, desempenho, PWA, gravação de tela). Não oficiais recusados após checagem (TMDB: pacote npm sem ligação comprovada com o repositório; acessibilidade: 0–4 estrelas). Ao reabrir: aprovar os 3 no `/mcp`, conferir se conectaram e perguntar se faz commit do `.mcp.json` (ainda sem commit).
3e. Commit `3f512b4` (2026-11-06): `.mcp.json` e a nota 3d publicados.
3f. ✅ Listas personalizadas completas: parte 1 (T001-120, D001-041), pré-listas (T001-121) e parte 2, ordem + link público (T001-122, SW `v26`) em 2026-11-06, SQL aplicado no Supabase. Publicado em `1b50c3a` + `3c0d797` (as duas branches, produção em `v26`, CI verde).

**Pausa em 2026-11-06 (usuário: "continuamos depois").** Próximo, à escolha do usuário: (a) vídeo de lançamento final com Remotion (skills globais; roteiro antigo em `Divulgacao/roteiro-do-video`), mostrando também listas, coleções e link; ou (b) teste real com dois celulares: amizade, indicação, Match ao vivo, séries com conta, listas com conta, ordem, link público aberto por outra pessoa e importação do convidado. Em espera até o usuário pedir: T001-094 e T001-095.
4. Vídeo de lançamento: foi só uma prévia; o de verdade será feito quando tudo estiver implementado (roteiro em `E:\Trabalhos\O que assistir\Divulgacao\roteiro-do-video`).

**Atualização 2026-11-05:** ordem confirmada pelo usuário. DNA do usuário partes 1 e 2 feitas (T001-098 e T001-099, site `v23`, sem commit). "Outros" sem barra e com os nomes (T001-101, aprovado). Comparar gostos feito em 2026-11-06 (T001-092, sem commit; falta o usuário rodar o `get_friend_profile` novo no Supabase). Próximo: indicações pelo DNA (T001-096). MCP do Supabase conectado (usar para consultar; alteração continua como SQL aprovado).

**Próxima sessão (anotado no fim de 2026-11-03):**
1. **Ordem combinada para as próximas funcionalidades** (recomendação aceita para conversar; confirmar com o usuário): DNA do usuário + estatísticas no perfil (FUNCIONALIDADES #27 e #63) → comparar gostos (T001-092, que compara o DNA de dois perfis) → indicações do dia pelo DNA de cada perfil (T001-096) → reações rápidas (T001-093, SQL). O usuário ainda vai escolher quais destas entram na fila: Surpreenda-me (#19), Sessão às escuras (#43), filtro por país (#21), Cine-batalha (#55), lançamentos e estreias (#20, #84), listas personalizadas (#25, SQL), efeito 3D nos pôsteres (#45). Em espera (servidor): T001-094 e T001-095. Descartado: compartilhar conquista.
2. **Teste real com dois celulares e duas contas** (só o usuário faz): amizade, indicação (deve chegar em segundos com `realtime_inbox.sql`), aviso no aparelho, Match ao vivo (inclusive recarregando no meio), lista do Match e WhatsApp com o ingresso no celular. Corrigir o que aparecer antes de abrir funcionalidade nova.
3. Restante em "Com o usuário" e "Validações pendentes".
4. **Vercel:** a produção sai da `main` (conferido pelo plugin em 2026-11-03; projeto `o-que-assistir`).

**Regras combinadas com o usuário (pedido em 2026-10-28):**
1. Um item por vez; perguntar "podemos continuar?" antes do próximo (exceção em 2026-10-30: 18 itens em sequência, a pedido).
2. Testar de verdade (Jest + Chrome em `http://localhost:5173`), limpando service worker/caches no início, e mostrar evidência.
3. Registrar cada item em `tasks.md`, `acceptance.md` (+ `evidence/`), `decisions.md` quando houver escolha, `spec.md`, `CHANGELOG.md`, `_meta.json` e `docs/FUNCIONALIDADES.md` (CRLF).
4. Mudança no banco: entregar SQL para o usuário rodar no SQL Editor; o CLI não tem permissão para alterar o banco.
5. Commit e push só quando o usuário pedir: push é publicação. A Vercel publica a partir da `main`; manter as duas branches iguais (`git push origin 004-series-tracking` e `git push origin 004-series-tracking:main`). Só o envio para a `main` muda o site.

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

### Ingresso e compartilhar (2026-11-03, publicado em `8b09a23`)
| ID | Item | Estado |
|---|---|---|
| T001-077 | Botão "Gerar ingresso" separado: baixa só a imagem | ✅ |
| T001-078 | "Compartilhar" abre opções. Celular: compartilhar do sistema com ingresso, texto e link. Computador: baixa o ingresso e copia o texto, ou abre o WhatsApp Web com o texto | ✅ |
| T001-079 | Enviar para amigos do app (`database/title_shares.sql`) e caixa "Indicações para você" no modal de amigos, que também conta no contador da aba | ✅ código e testes; **falta o usuário rodar o SQL** |
| T001-080 | Ingresso na cor do tipo: âmbar, teal, rosa. Série coreana conta como dorama (`origin_country` KR) | ✅ |
| T001-081 | Sinopse cortada para caber, até 4 nomes do elenco e logos de onde assistir. Os logos do TMDB exportam com CORS; se algum falhar, o ingresso mostra os nomes | ✅ |

Depois do teste do usuário: o WhatsApp não recebe imagem pelo link `wa.me`. No computador, o botão copia o ingresso para colar com Ctrl+V (ou baixa, se o navegador não deixar copiar). No celular sem o compartilhar do sistema (fora de HTTPS), baixa o ingresso para anexar pelo clipe.

### Conquistas sociais (2026-11-03, publicado em `8b09a23`)
6 conquistas na categoria Social: Turma (1 amigo), Popular (5), Indicador (1 indicação), Curador (10), Bilheteiro (compartilhou um ingresso), Par Perfeito (primeiro match). Os contadores ficam em `progress.social`, nos metadados da conta (convidado: neste aparelho). Não precisa de SQL. Amigos guarda o maior número já visto, então desfazer amizade não tira a conquista.

### Revisão de UX e acessibilidade das telas novas (2026-11-03, publicado em `8b09a23`)
- O botão Amigos agora diz em voz alta quantos pedidos e indicações estão esperando. Antes, o `aria-label` fixo escondia o número.
- Apagar uma indicação tem "Desfazer" e Ctrl+Z, como as outras remoções. O foco vai para o próximo item ou volta ao lugar certo.
- Os botões de gerar, compartilhar e enviar para amigo usam `aria-disabled` e `aria-busy` em vez de `disabled`, para não perder o foco do teclado. Mostram "Gerando…" ou "Preparando…" enquanto trabalham. O enviado é anunciado como "Enviado para Bia".
- Abrir uma indicação mostra o título por cima da lista de amigos. Ao fechar, o foco volta para a lista.
- As conquistas dizem "desbloqueada" ou "bloqueada" em texto para o leitor de tela, e não só pela cor.
- O atalho de colar aparece como Cmd+V no Mac e Ctrl+V nos outros sistemas. "Compartilhar" tem `aria-haspopup="dialog"`. Nomes longos nos botões de amigo quebram a linha, e esses botões têm 44px de altura.

### Match ao vivo (spec 006, 2026-11-03, publicado em `8b09a23`)
Cada pessoa vota no seu aparelho, ao mesmo tempo, por um canal de broadcast do Supabase Realtime (`openLiveRoom` em `src/api/supabase.js`). Não precisa de SQL nem de conta. O protocolo puro está em `src/domain/liveMatch.js`, com testes. A sala é aberta por link `?ao-vivo=CÓDIGO`, pelo código digitado ou por convite na caixa de um amigo (`ao-vivo:CÓDIGO`). Cada um vê até onde o outro chegou. Os votos só são trocados depois que os dois terminam. Uma terceira pessoa recebe "cheio", e a saída de alguém é avisada pela presença do Realtime. Nos testes, o falso Supabase usa `BroadcastChannel` entre duas abas (fixture `openPage`).

Precisa ser conferido com o Supabase real: o Realtime precisa estar ligado no projeto, com acesso público a canais de broadcast (é o padrão).

### Lista do Match, sala que sobrevive a recarregar, avisos (2026-11-03, publicado em `2a72f05`)
- **Sala que sobrevive a recarregar:** cada voto e cada mensagem salvam a partida na aba. Ao recarregar, a pessoa volta ao mesmo cartão, o outro vê "voltou!" e os votos perdidos são reenviados. Ao terminar, a sala salva e o código no endereço são apagados.
- **Lista do Match ("Seus matches"):** cada partida com match fica guardada para quem jogou, com quem foi e quando (até 15 partidas, só com os ids dos títulos). A conta guarda nos metadados e o convidado no aparelho. Os títulos abrem, dá para salvar todos em Quero Assistir e apagar tem desfazer.
- **Avisos:** indicação, convite de Match (inclusive ao vivo), pedido de amizade e aceite viram aviso dentro do app e atualizam o contador. Chegam na hora com `database/realtime_inbox.sql` (publicação do Realtime). Sem esse SQL, aparecem ao voltar para a aba ou a cada 2 minutos. A opção "Avisar neste aparelho" mostra notificação do sistema com o app em segundo plano; não funciona com o app fechado, porque isso exigiria push pelo servidor.

`database/realtime_inbox.sql` rodado pelo usuário em 2026-11-03. Não dá para conferir de fora com a chave pública; a confirmação vem no teste com dois celulares.

Testes: Jest 268, banco 17, e2e 126. Service worker em `v20`.

### Progresso nas conquistas (2026-11-03, T001-089, publicado no site `v21`)
Conquistas bloqueadas com meta maior que 1 mostram quanto falta ("4 de 10") e uma barrinha. Cada conquista agora tem `goal` e `count` em `src/domain/badges.js`; `check` sai disso, então o desbloqueio não mudou. Só no app, sem SQL. Fecha o último item aberto da spec 007. Testes: Jest 275, e2e 127. Service worker em `v21`.

### DNA do usuário (2026-11-05, T001-098, site `v23`, ainda não publicado)
Seção "Seu DNA" no perfil, logo abaixo de "Títulos assistidos": frase "Você é 60% Terror, 10% Drama…", barras dos 5 gêneros mais assistidos e Outros, quantos filmes, séries e doramas, década favorita e títulos por mês nos últimos 6 meses. Calculado só com o histórico salvo (D001-033), sem rede nem SQL. Lógica em `src/domain/tasteDna.js`, tela em `src/app/tasteDna.js`. O rótulo "Filmes Assistidos" virou "Títulos assistidos". Testes: Jest 324, e2e 143. Service worker em `v23`. Parte 2 (T001-099, D001-034): horas assistidas (aprox.) e ator mais visto, com detalhes do TMDB guardados no aparelho em `title_facts` e apagados ao sair da conta. Dois testes instáveis corrigidos (T001-100). Testes: Jest 340, e2e 147.

### Canto inferior direito sem sobreposição (2026-11-03, T001-097, site `v22`)
O usuário viu o aviso e a faixa "Instalar App" por cima do botão ✨. Agora os avisos ficam à esquerda do botão; a faixa termina antes dele no computador; no celular a faixa fica embaixo e o canto inteiro sobe (o `pwa.js` publica a altura em `--install-banner-h`). "Voltar ao topo" e conquista ficam acima do botão. Regras no fim do `style.css` ("CANTO INFERIOR DIREITO"). Teste que mede cada par de elementos em `dailyPicks.spec.js`.

### Indicações do dia (2026-11-03, T001-091, publicado no site `v21`)
Um filme, uma série e um dorama bem avaliados, iguais para todo mundo no mesmo dia, escolhidos pela data num grupo fixo do TMDB (D001-031). Trocam à meia-noite, mesmo com a aba aberta. Tocar abre o título como qualquer resultado (e conta nos desafios de abrir títulos). Se o TMDB falhar, a seção some. Depois de dois ajustes a pedido do usuário, ficou num painel flutuante com botão no canto (como chat de ajuda), aberto sozinho só na primeira entrada do dia (D001-032). Sem SQL. Testes: Jest 306, e2e 137.

### Desafio do dia e meta da semana (2026-11-03, T001-090, publicado no site `v21`)
Um desafio por dia, escolhido pela data entre 10 (9 para convidado, sem o de indicar a amigo): assistir, salvar 2, abrir 3, descobrir terror, comédia ou título antes de 2000, girar a roleta, dar match, compartilhar ingresso, indicar a amigo. Vale 25 XP. Meta da semana: assistir 3 títulos de segunda a domingo, 50 XP. Aparecem no perfil com barra de andamento; o desafio vem no aviso ao entrar; a conclusão usa o mesmo aviso das conquistas. Andamento em `progress.challenges` (D001-030). Sem SQL. Os pontos do app avisam `trackChallenge(evento, título)`. Testes: Jest 291, e2e 131.

**Próximas funcionalidades pedidas (2026-11-03), uma por vez:** filme do dia (T001-091), comparar gostos (T001-092), reações rápidas (T001-093, SQL), Compartilhar conquista foi descartado pelo usuário. **Em espera** (usuário, 2026-11-03: o que precisa de servidor fica para depois): ranking entre amigos (T001-094) e aviso de sequência com app fechado (T001-095, push).

### Antes de publicar
| Item | Estado |
|---|---|
| Teste real de amizade entre duas contas (T001-071) | SQL rodado pelo usuário; falta a segunda conta e informar o username dela |
| Rodar `database/title_shares.sql` no Supabase (depois de `friends.sql`) | ✅ rodado em 2026-11-03 (função e tabela conferidas pela API) |
| Commit e push | ✅ `2a72f05` publicado em 2026-11-03 (site em `v20`); `main` avançada até o mesmo commit |
| Rodar `database/realtime_inbox.sql` | ✅ rodado pelo usuário em 2026-11-03 (confirmar no teste com dois celulares) |
| Branch de produção na Vercel → `main` | ✅ conferido em 2026-11-03: já era a `main` |
| Revogar a chave TMDB antiga | ✅ revogada pelo usuário; proxy conferido funcionando com a chave nova |

### Com o usuário
- Ligar a confirmação de email e conferir a Site URL no Supabase.
- Passar os links certos do rodapé. Hoje "Apoiar" leva para a página inicial do Buy Me a Coffee.
- Limpar os dados de teste da conta real.

---

## Validações pendentes (precisam do usuário)

| O quê | Por quê |
|---|---|
| iPhone real | zoom/zoom automático dos campos (AC-001) |
| Com login | conquista Madrugador gravando no Supabase (AC-009), troca de senha (AC-015), desfazer com Supabase real (AC-024) |
| Leitor de tela (NVDA/VoiceOver) | nomes acessíveis de cards/perfil/diálogos (AC-013, AC-016) |
| Decisão visual | aprovar a nova identidade "Sala escura" (D001-018), que inclui texto escuro nos botões dos 3 temas |

---

## Test Results

| Migration | Unit (Jest) | Navegador (Chrome) |
|-----------|-------------|--------------------|
| 001 | 145/145 ✅ | critérios AC-001…AC-043 ✅, com as ressalvas acima |
| 001 (2026-11-03) | 268/268 ✅ + banco 17/17 ✅ | Playwright 126/126 ✅ (Realtime simulado entre duas abas) |

## Publicação

O site `https://o-que-assistir-watch.vercel.app/` é publicado a partir da branch `004-series-tracking`. Em 2026-11-03 estava no commit `2a72f05` (cache `v20`), e a `main` foi avançada até o mesmo commit. Até a Vercel ser configurada para `main`, tratar todo push como publicação e manter as duas branches iguais. Para conferir uma publicação: `curl -s https://o-que-assistir-watch.vercel.app/sw.js | grep CACHE_VERSION`.
