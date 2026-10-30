# Acceptance Criteria — Migration 001

**Feature:** 008-qualidade-a11y-seguranca
**Migration:** 001
**Date:** 2026-10-28
**Branch:** 004-series-tracking

## Expectativa

> O app fica seguro contra XSS, utilizável por teclado e leitor de tela
> (WCAG 2.2) e sem bugs visíveis, sem mudar as funcionalidades existentes.

### DEVE fazer:
- Exibir como texto qualquer HTML digitado ou vindo da API
- Permitir zoom e uso completo por teclado nos modais
- Enviar buscas e filtros completos ao TMDB

### NÃO DEVE fazer:
- ❌ Remover ou mudar o comportamento de funcionalidades existentes
- ❌ Quebrar testes existentes

---

## Ambiente de teste

- Chrome (extensão Claude in Chrome), `http://localhost:5173` via `npx http-server -c-1`
- Antes de cada teste: service worker desregistrado e caches apagados (o SW servia o JS antigo — ver FR-036)
- Usuário **não logado** (Supabase falha em localhost: `AuthRetryableFetchError`, pré-existente)
- Chamadas reais à API do TMDB

---

## Checklist de Aceite

### AC-001 — Zoom liberado (T001-001) ✅
- [x] Viewport = `width=device-width, initial-scale=1.0` (`zoomBloqueado: false`)
- [x] Regra `@media (pointer: coarse)` carregada; em toque simulado: campo 16px, select 16px
- [x] Desktop inalterado: campo 15.2px, select 12.8px
- Evidência: `evidence/01-zoom-viewport-mobile.jpg` (430px de largura)
- ⚠️ Não testado em iPhone real (sem tela de toque no ambiente)

### AC-002 — XSS (T001-002) ✅
Payload: `<img src=x onerror="window.__xss++">`

| Teste | Antes (JS antigo via SW) | Depois |
|---|---|---|
| Item na roleta | executou | texto puro, 0 `<img>` |
| Busca sem resultado | executou | texto puro, 0 `<img>` |
| Título malicioso da API em resultados | — | texto puro, 0 `<img>` |
| Execuções totais | **2** | **0** |
| "Tom & Jerry", `O "Auto" da Compadecida` | — | legíveis |

- Evidência: `evidence/02-xss-roleta-texto-puro.jpg`

### AC-003 — Encode das buscas (T001-003) ✅

| Termo | TMDB recebia antes | Recebe agora | Resultado |
|---|---|---|---|
| `Simon & Garfunkel` (ator) | `"Simon "` | completo | 2 sugestões |
| `Velozes & Furiosos` | `"Velozes "` | completo | 16 (1º "Velozes & Furiosos 10") |
| `Ocean's #11` | `"Ocean's "` e sem `language` | completo | 10 (inclui "Onze Homens e um Segredo") |

- Evidência: `evidence/03-busca-encode-oceans-11.jpg`

### AC-004 — Ano atual (T001-004) ✅
- [x] `max` dos campos = 2026; 2026 válido, 2027 inválido
- [x] Top 10 com só "De 2026": intervalo `2026-01-01 → 2026-12-31`, 20 resultados (ex.: "Homem-Aranha: Um Novo Dia (2026-07-29)")
- [x] Intervalo antigo `2026-01-01 → 2025-12-31` consultado no TMDB: **0 resultados**
- Evidência: `evidence/04-filtro-ano-2026-top10.jpg`

### AC-005 — `.gitignore` (T001-005) ✅
`git check-ignore -v`: `package-lock.json` versionado; `.claude/settings.local.json` ignorado (linha 63); `index.html`, `.claude/settings.json` versionados; `.env`, `node_modules/` ignorados. `npm ls` bate com o lock.

### AC-006 — `event` global (T001-006) ✅

| Teste | Antes | Depois |
|---|---|---|
| `switchMode('roulette')` por código | `TypeError` | aba "Roleta" ativa |
| Clique no ícone do "Ver Top 10" | texto ia para o `<svg>` | botão desabilita, "Carregando..." → "Ver Top 10", 10 resultados |
| "Adicionar à Roleta" do modal | botão do modal virava aba ativa | aba "Roleta" ativa |

### AC-007 — Modais acessíveis (T001-007) ✅ (teclado real)
- [x] Enter num resultado → foco no diálogo rotulado "Homem-Aranha: Um Novo Dia"; fundo `inert`
- [x] 30× Tab + 5× Shift+Tab → 21 focos, todos dentro do modal
- [x] Esc → fecha, foco volta ao item de origem, `inert` removido, trailer e `_episodesState` limpos
- [x] Perfil: foco em "Meu Perfil"; ao fechar pelo botão, foco volta ao perfil
- Evidência: `evidence/05-modal-foco-preso.jpg` (anel de foco em "Não tenho interesse")
- ⚠️ Não testado: modal de histórico de sorteios e modal aberto a partir de outro

### AC-008 — Links de crítica (T001-008) ✅

| Título | IMDb | RT |
|---|---|---|
| Cidade de Deus (filme) | `imdb.com/title/tt0317248/` | busca "Cidade de Deus" |
| Breaking Bad (série, via `external_ids`) | `imdb.com/title/tt0903747/` | busca "Breaking Bad" |

### AC-009 — Madrugador (T001-009) ✅
- [x] Histórico só de dia → bloqueada; item às 3h12 → desbloqueada
- [x] 5 testes Jest (`isNightOwlWatch` nos limites 0h, 4h59, 5h, 23h59, inválido)
- ⚠️ Não testado: gravação no Supabase via `checkBadgeUnlock` (exige login)

### AC-010 — Dicas nos filtros (T001-010) ✅
- [x] Textos ligados por `aria-describedby`; anos com `inputmode="numeric"`
- Evidência: `evidence/07-dicas-filtros.jpg`

### AC-011 — Falha de seção do modal (T001-011) ✅
Breaking Bad aberto antes, depois Cidade de Deus com elenco/plataformas falhando (simulado):

| | Antes | Depois |
|---|---|---|
| Elenco | 8 atores de Breaking Bad ficavam | "Não foi possível carregar o elenco." |
| Plataformas | 2 plataformas de Breaking Bad ficavam | "Não foi possível verificar onde assistir." |

- Evidência: `evidence/06-modal-avisos-e-links-critica.jpg`

### AC-012 — Controles como `<button>` + setas (T001-012) ✅ (teclado e mouse reais)

| Teste | Antes (pelo código) | Depois |
|---|---|---|
| Ordem do Tab a partir do perfil | perfil não focável (`div`) | perfil → aba Descobrir → card Filme → campo de ator |
| "Roleta", "Série", "Dorama", abas da biblioteca | inalcançáveis (`tabindex=-1`, sem setas) | ArrowRight → Roleta ativa e visível; ArrowRight → Série (tema `tv`); End → Dorama; Home → Filme |
| Enter no perfil | nada | abre "Meu Perfil"; Esc devolve foco ao perfil |
| Biblioteca | `div` com `onclick` + botão dentro | Enter abre "Cidade de Deus"; Tab → "Remover Cidade de Deus"; Espaço remove; 0 botões aninhados |
| Aba "Em Andamento" por seta | — | foco e seleção na aba; painel rotulado por `tab-andando` |
| Card "Em Andamento" (mouse) | `article` com `onclick` | clique no pôster abre detalhes; clique em "Episódios" abre só episódios |
| ✕ da roleta | `span` | `button` "Remover Cidade de Deus da roleta"; Enter remove |
| Pessoa selecionada | `div role=button` sem Enter/Espaço | Espaço remove o filtro |
| Histórico de sorteios | `div` | `button` "Cidade de Deus Último"; modal recebe foco (cobre parte do AC-007) |

- Evidências: `evidence/08-botoes-setas-dorama-selecionado.jpg`, `evidence/09-biblioteca-em-andamento-botoes.jpg` (visual igual ao anterior)
- Dados da biblioteca simulados (sem login) com `supabaseGetWatchlist`/`supabaseGetAllSeriesInProgress` substituídos só na página de teste
- Dois falsos alarmes do próprio teste, investigados: clique fora do botão "Episódios" (y=550, botão em 556–584) e foco em elemento oculto da roleta

### AC-013 — Rótulos em controles só com ícone (T001-013) ✅

| Controle | Antes | Depois (árvore de acessibilidade do Chrome) |
|---|---|---|
| ‹ do histórico | só `title` | button "Sorteio anterior" |
| › do histórico | só `title` | button "Próximo sorteio" |
| × do banner "Instalar App" | sem nome ("×") | button "Dispensar instalação do app" |
| ✕ da lista de ignorados | só `title="Remover"` | "Voltar a sugerir Cidade de Deus" |
| Logo de streaming (link com imagem) | sem nome (`<img>` sem `alt`) | "Ver no Netflix (abre em nova aba)" |

- Varredura na página com modal, banner, ignorados e plataformas renderizados: **56 controles, 0 sem nome ou só com `title`/símbolo**
- Evidências: `evidence/10-rotulo-navegacao-historico.jpg`, `evidence/11-rotulo-logo-streaming.jpg` (foco visível nos controles)
- ⚠️ Limitação da ferramenta: a árvore da extensão só lê `aria-label` e texto direto do elemento — mostra cards ("FILME" num `<span>`), perfil ("Convidado" num `<span>`) e o diálogo (`aria-labelledby`) sem nome. Pela especificação de nome acessível o texto descendente e o `aria-labelledby` contam. **Pendente:** confirmar com leitor de tela real (NVDA/VoiceOver).

### AC-014 — Service worker entrega atualizações (T001-014) ✅

| Cenário | Como foi testado | Resultado |
|---|---|---|
| 1. Upgrade de quem tem o SW antigo | criados caches `oqueassistir-static-v2`/`dynamic-v2` com um `script.js` falso ("JS ANTIGO"), depois recarregada a página | caches viraram `static-v3`/`dynamic-v3`; `/legacy/script.js` servido é o novo (tem `initRovingGroups`), não o falso |
| 2. Atualização chega sem limpar cache | `sw-test.txt` = "versao-1" lido via SW; arquivo trocado no servidor para "versao-2"; lido de novo | resposta "versao-2" e cache atualizado para "versao-2" (antes, cache-first devolveria "versao-1") |
| 3. Offline | servidor **desligado** (confirmado: `Invoke-WebRequest` falha e `fetch` sem cache falha), página recarregada | app abre do cache: título, JS (`initRovingGroups`) e CSS carregados |

- Evidência: `evidence/12-sw-offline-servidor-desligado.jpg` (tela de login renderizada com o servidor fora do ar)
- "Antes" real: nos testes de T001-002 o navegador servia o `script.js` antigo pelo SW (`escapeHtml` inexistente) até apagar os caches à mão
- Código morto: 0 referências restantes a `scheduleUpNextLoad`, `loadUpNextWidget`, `buildUpNextCard`, `renderUpNextSkeletons`, `up-next-section`, `up-next-list`, `up-next-skeleton`, `CACHE_NAME`; Jest 125/125
- Arquivo temporário `sw-test.txt` removido após o teste; SW e caches do localhost limpos

### AC-015 — Labels no perfil e na senha (T001-015) ✅

| Campo | Antes | Depois |
|---|---|---|
| Nome do perfil | só placeholder | `<label>` "Nome de exibição", `autocomplete="nickname"` |
| Email do perfil | só placeholder | `<label>` "Email", `autocomplete="email"` |
| Nova senha | só placeholder | `<label>` "Nova senha", `autocomplete="new-password"`, descrição "A senha precisa ter pelo menos 6 caracteres." |
| Confirmar nova senha | só placeholder | `<label>` "Confirmar nova senha", `autocomplete="new-password"` |
| Senha do cadastro | dica "Mínimo 4" (código exige 6) | dica "Mínimo 6 caracteres" |

- Clique real no texto "Nova senha" → foco vai para o campo
- Evidências: `evidence/13-label-senha-clique-foca-campo.jpg`, `evidence/14-labels-perfil.jpg`
- Nenhum valor de senha foi digitado ou lido no teste (só rótulos e atributos)
- Não testado: troca de senha de fato (exige login e chamaria o Supabase — ver D001-010)

### AC-016 — SVGs decorativos ocultos (T001-016) ✅

| Verificação | Antes | Depois |
|---|---|---|
| SVGs com `aria-hidden` (código) | 5 de 81 | 81 de 81 |
| `<h1>` do login | vazio (só SVG) | "O Que Assistir?" |
| SVGs expostos ao leitor de tela em 8 estados renderizados (onboarding, banner PWA, Top 10 carregando e pronto, busca vazia, modal com nota, perfil com 12 conquistas, roleta, biblioteca vazia) | — | **0** |
| Controles/headings sem nome após ocultar os ícones | — | **0 de 82** |

- Ícones continuam visíveis: `evidence/15-svgs-ocultos-icones-visiveis.jpg` (conquistas no perfil)
- Nome acessível calculado ignorando nós `aria-hidden` (regra da especificação); leitor de tela real segue pendente (ver AC-013)

### AC-017 — Contraste (T001-017) ✅

**Antes** (tema Filme, medido): 10 falhas na página principal, 2 no modal, 32 no perfil, 2 na roleta. Piores:

| Texto | Contraste antes | Causa |
|---|---|---|
| Descrições das conquistas bloqueadas | 1.38:1 | `opacity: 0.35` no card inteiro |
| "Onde Assistir (Brasil)", "Elenco Principal" | 2.14–2.22:1 | `--text-muted` (0.25) |
| Rodapé "Apoiar" / "Feedback" | 2.53:1 | `opacity: 0.5` inline |
| "Roleta", abas inativas | 3.82:1 | `--text-tertiary` (0.4) |
| "Quero Assistir" ativo, "FILME", "Ver Top 10" | 3.99–4.25:1 | vermelho `#e50914` como texto |

Calculado (não medido no DOM): branco sobre dourado (Série) **2.15:1**, sobre rosa (Dorama) **3.53:1**, sobre hover vermelho **3.88:1**.

**Depois** — mesma medição nos 3 temas, após esperar as transições de CSS:

| Estado | Filme | Série | Dorama |
|---|---|---|---|
| Login (27 textos) | 0 falhas | — | — |
| Principal (20) | 0 | 0 | 0 |
| Modal de detalhes (43) | 0 | 0 | 0 |
| Perfil (66) | 0 | 0 | 0 |
| Roleta (12) | 0 | 0 | 0 |

- Evidências: `evidence/16-contraste-tema-serie-texto-escuro.jpg` (botões dourados com texto escuro), `evidence/17-contraste-conquistas-bloqueadas.jpg`; script da medição em `evidence/contrast-audit.js`
- Falso alarme investigado: primeira medição pós-mudança deu "1.00:1" — era a transição de cor (0.25s) ainda em andamento; refeito com espera de 700 ms
- Limitações: fundos com gradiente/imagem são aproximados pela cor de fundo; estados de hover foram calculados a partir dos tokens, não medidos com o mouse

### AC-018 — Foco visível (T001-018) ✅

Medido com modo de teclado ativo (Tab real), 15 elementos, focando cada um e lendo o estilo computado:

| Elemento | Antes | Depois |
|---|---|---|
| Email do login (`.form-group input`) | **só borda 1px** | outline 2px, 3.94:1 |
| Seletor de temporada | **só borda 1px** | outline 2px, 4.13:1 |
| Perfil (pílula) | outline, mas raio **9999px → 6px** | outline 2px, raio mantido |
| Card "Filme" | outline, raio **16px → 6px** | outline 2px, raio mantido |
| Demais 11 (campos, selects, abas, botões, links) | outline, raio mudava para 6px | outline 2px, raio mantido |

- Contraste do indicador ≥ 3:1 em todos (3.94–4.25:1)
- Evidências: `evidence/18-foco-visivel-email-login.png`, `evidence/19-foco-perfil-mantem-pilula.png`
- **Achado novo (FR-041):** com a tela de login aberta, o Tab sai dela — depois de "Entrar como Convidado" o foco vai para o perfil da página de trás (o fundo não fica `inert`). Sequência medida: login-tab → email → senha → "Esqueceu" → Entrar → Convidado → **user-pill**.

### AC-019 — Login e onboarding prendem o foco (T001-019) ✅ (teclado real)

Primeira visita simulada (`has_visited` removido), login + onboarding abertos:

| Teste | Antes | Depois |
|---|---|---|
| Foco ao abrir | — | diálogo "Bem-vindo!"; pilha `[login, onboarding]`; fundo `inert` |
| 4× Tab + 2× Shift+Tab no onboarding | — | foco só em "Começar" |
| Esc no onboarding | — | fecha; foco volta para o diálogo "O Que Assistir?" (login) |
| 9× Tab + 3× Shift+Tab no login | Tab saía para o perfil da página de trás | ciclo login-tab → email → senha → "Esqueceu" → Entrar → Convidado → login-tab; 0 focos fora |
| Sair do login (`display: none`, como `loginAsGuest()`) | — | pilha vazia, `inert` removido, Tab chega em perfil → Descobrir → Filme |
| Regressão: modal de perfil (item 2) | — | foco em "Meu Perfil", Esc devolve foco ao botão de perfil |

- Console sem erros após a correção (antes da correção: `ReferenceError: Cannot access 'openModals' before initialization`, que abortava a inicialização — pego no teste, não chegou a ser reportado como pronto)
- Evidência: `evidence/20-login-foco-preso-volta-para-entrar.jpg` (Tab após "Entrar como Convidado" volta para "Entrar")
- Não testado: aba "Criar Conta" (mesma lógica de ciclo; muda só quais campos estão visíveis)

### AC-020 — Aba "Criar Conta" e trap com roving tabindex (T001-020) ✅ (teclado real)

| Teste | Antes | Depois |
|---|---|---|
| Seta → no "Entrar" | — | aba "Criar Conta" ativa, painel rotulado por `register-tab` |
| Rótulos dos 4 campos | — | "Escolha um usuário", "Email", "Escolha uma senha", "Confirme a senha" |
| 8× Tab + 2× Shift+Tab | volta ia para "Entrar" (aba **inativa**, `tabindex=-1`) | usuário → email → senha → confirmar → Criar Conta → Convidado → **"Criar Conta" (aba ativa)**; 0 focos fora; aba inativa nunca visitada |

- Evidência: `evidence/21-criar-conta-foco-preso.jpg`

### AC-021 — `transition: all` (T001-021) ✅

| Verificação | Antes | Depois |
|---|---|---|
| `transition: all` no CSS | 19 | 0 |
| Elementos na página com `all` **e duração > 0** (estilo computado) | — | 0 |
| Propriedades computadas (amostra) | `all` | `.btn-login`: background-color, transform, box-shadow · `.login-tab`: background-color, border-color, color · `.scroll-top-btn`: opacity, visibility, transform, box-shadow · `.tooltip::after`: opacity, transform |

Animações continuam acontecendo (valor medido no meio da transição, ~90 ms):

| Estado | Início → meio → fim |
|---|---|
| Aba "Criar Conta" ativa (background-color) | transparente → rgba(229,9,20,**0.59**) → rgb(229,9,20) |
| Ponto do onboarding ativo (width) | 8px → **16.4px** → 24px |
| Botão "voltar ao topo" visível (opacity) | 0 → **0.59** → 1 |
| Barra de força da senha fraca → forte (width) | 106px → **234px** → 322px |

- Falso alarme investigado: a primeira varredura listou centenas de elementos com `all` — é o valor **padrão** de `transition-property` com duração 0s; refeito filtrando duração > 0
- `.password-strength-bar` anima `width` (não é compositor-friendly, mas é uma barra de 4px; trocar por `transform: scaleX` mudaria o CSS das 3 variantes — deixado como está)

### AC-022 — Imagens (T001-022) ✅

| Verificação (código) | Antes | Depois |
|---|---|---|
| `<img>` sem `alt` | 2 de 10 | 0 |
| `<img>` com `width`/`height` | 0 de 10 | 10 |
| Listas com `loading="lazy"` | 5 de 9 | 9 (fundo do modal eager de propósito) |
| Uso de `via.placeholder.com` | 2 | 0 |

Medido no navegador (Top 10, modal de Breaking Bad, biblioteca, "Em Andamento", histórico — biblioteca/histórico com dados simulados):

| Imagem | Tamanho exibido | Proporção | Carregou |
|---|---|---|---|
| Resultados | 111×167 | 1.50 (2:3) ✅ | sim |
| Biblioteca | 122×182 | 1.50 ✅ | sim |
| Histórico | 121×182 | 1.50 ✅ | sim |
| "Em Andamento" | 48×72 | 1.50 ✅ | sim |
| Elenco (com e sem foto) | 60×60 | 1.00 ✅ | sim — sem foto usa o placeholder local |
| Logos de streaming | 44×44 | 1.00 ✅ | sim |
| Fundo do modal | 598×200 | (object-fit cover) | sim |

- **Layout shift (CLS) durante todo o fluxo: 0** (`PerformanceObserver` de `layout-shift`)
- **Requisições a `via.placeholder.com`: 0**
- Evidência: `evidence/22-placeholder-local-elenco.jpg` (ator sem foto com o placeholder local ao lado de fotos reais)

### AC-023 — Diálogos do app no lugar dos nativos (T001-023) ✅

`window.confirm`/`window.alert` substituídos por contadores durante todo o teste: **0 chamadas nativas**.

| Cenário | Resultado |
|---|---|
| Limpar roleta → Enter (foco inicial em "Cancelar") | 3 itens mantidos; foco volta para "Limpar Lista" |
| Limpar roleta → Esc | 3 itens mantidos |
| Limpar roleta → Tab + Enter ("Limpar") | 0 itens; toast "Lista limpa!" |
| Perfil aberto → "Limpar tudo" (ignorados) | pilha `[perfil, confirmação]`; foco em "Cancelar" |
| …→ Esc | só a confirmação fecha; perfil continua aberto; ignorados mantidos; foco volta para "Limpar tudo" (após correção) |
| Esqueci a senha (sobre o login) | diálogo visível acima do login; cancelar = 0 emails; confirmar = 1 (Supabase simulado) |
| Sair → Cancelar | usuário continua logado |
| Deletar conta | etapa 1 "Deletar conta permanentemente?" (botão vermelho, foco em Cancelar) → etapa 2 "Última confirmação"; cancelar na 2ª = 0 exclusões; confirmar as duas = 1 (Supabase simulado) |
| Nova versão disponível | botões "Depois" / "Atualizar agora"; "Depois" resolve `false` |
| Erro fatal do Supabase | aviso `role="alert"` no topo da página |

- Evidências: `evidence/23-confirmacao-roleta-foco-cancelar.jpg`, `evidence/24-confirmacao-deletar-conta.jpg`, `evidence/25-erro-fatal-na-pagina.jpg`
- Falso alarme investigado: o primeiro Enter logo após carregar a página não abriu o diálogo — a aba ainda não tinha foco de janela; com `document.hasFocus() === true` o mesmo Enter abre (eventos keydown → click registrados)
- Não testado de ponta a ponta: o aviso de nova versão disparado por um SW real (testado chamando `confirmDialog` com os mesmos argumentos) e o erro fatal com o SDK realmente bloqueado (testado chamando `showFatalError`)

### AC-024 — Desfazer (T001-024) ✅

Supabase simulado em memória (watchlist com 3 filmes); contadas as chamadas reais de remoção.

| Cenário | Resultado |
|---|---|
| ✕ em "Cidade de Deus" pelo teclado | some na hora; cabeçalho "FILMES (3)" → "(2)"; foco em "Desfazer"; **0** chamadas |
| Ctrl+Z (ou Enter em "Desfazer") | volta; "FILMES (3)"; foco volta para "Cidade de Deus"; **0** chamadas |
| ✕ e esperar 5 s | **1** chamada; aviso some |
| Dois ✕ seguidos | o 1º grava (1 chamada); o 2º continua pendente mesmo após o redesenho; desfazer o 2º o traz de volta (total 1 chamada) |
| ✕ na roleta ("B" de A/B/C) → Desfazer | volta na mesma posição: A, B, C |
| ✕ nos ignorados como convidado | some na hora; `localStorage` intacto até o prazo; Desfazer restaura; após 5 s o `localStorage` perde o item |
| Ctrl+Z com foco num campo de texto | não desfaz a remoção (Ctrl+Z fica para o campo) |

- Evidência: `evidence/26-desfazer-remocao-biblioteca.jpg` ("FILMES (2)" + aviso "Removido de Quero Assistir." com "Desfazer")
- Limitação: fechar a aba durante os 5 s dispara a gravação no `pagehide`, mas o navegador pode cortar a requisição — nesse caso o item **continua** salvo (falha segura: nada se perde)
- Não testado: com Supabase real (exige login — D001-010)

### AC-025 — Atributos de formulário (T001-025) ✅

| Campo | `name` | `spellcheck` |
|---|---|---|
| `login-email` / `register-email` | `email` | `false` |
| `register-username` | `username` | `false` |
| `login-password` | `password` | — |
| `register-password` / `register-confirm` | `new-password` / `confirm-password` | — |
| `profile-name` / `profile-email` | já tinham | `false` |

- Valores lidos do DOM no Chrome, com service worker e caches limpos; digitação real no campo de email do login funciona
- Evidência: `evidence/27-atributos-login.jpg`
- Não testado: preenchimento por gerenciador de senhas e envio de login/cadastro (Supabase desabilitado — D001-010)

### AC-026 a AC-043 — Rodada final (T001-026…T001-043) ✅

Testado no Chrome com servidor local que troca o SDK por um Supabase falso em memória (`?fake=1`), e sem ele (SDK real, com o Supabase desabilitado). Celular: iframe de 390px.

| Item | Cenário | Resultado |
|---|---|---|
| FR-039 | Banner + modal aberto em 390px | ponto central do FECHAR é o próprio botão; z-index 900 × 1000 |
| FR-020/028 | Fontes e conexões | Big Shoulders e Atkinson carregadas via `<link>` |
| FR-022 | Estilo computado | `color-scheme: dark` |
| FR-024 | Medição em 390px | Sair 60×44, aba 133×44, Marcar 117×44*, FECHAR 337×53 |
| FR-023 | Episódios em 390px | seletor na largura toda + 4 botões em 2 colunas |
| FR-025 | Título de 160 caracteres na roleta; cabeçalho | cabe na tela; excesso horizontal 11px → 0 |
| FR-026 | Estilo computado | `overscroll-behavior: contain` |
| FR-034 | 5 testes do cliente + uso real | cache, erro, cancelamento; sem aviso falso ao cancelar |
| FR-019 | 6 testes + tela | nota "9,0", "1/7 assistidos · 6 restantes" |
| FR-032 | Fluxos completos sem erro no console | login simulado, convidado, sorteio, Top 10, busca, modal, biblioteca, desfazer, roleta, episódios, ignorados, histórico |
| FR-033 | Varredura do DOM | 0 atributos `on*` |
| FR-018 | Link `?tipo=tv&titulo=tv-1396&genero=35&de=2008` | abre Breaking Bad com tema e filtros; fechar limpa `titulo`; convidado vê o modal só depois de entrar |
| FR-029 | Varredura | 1 estilo em template (largura calculada) |
| FR-030 | Varredura por emoji | 1 ocorrência: "★" no texto copiado ao compartilhar (não é ícone) |
| FR-027 | Auditoria de contraste nos 3 temas com perfil aberto | 0 falhas; controle positivo detectado |
| FR-031 | Roleta real com 4 vitórias | "Hoje é dia de: Alien", bilhete "Apostador", gravado, confete |
| SW | Mudança real no `sw.js` | aviso "Nova versão" → "Atualizar agora" → recarrega; só caches v4; módulos no cache offline |

\* 43,x px medido durante a animação de abertura do modal, que aplica escala.

- Evidências: `evidence/28-aviso-nova-versao.jpg`, `29-roleta-vencedor-conquista.jpg`, `30-episodios-celular.jpg`, `31-inicio-celular.jpg`, `32-tema-dorama.jpg`
- Não testado: iPhone real (`safe-area` vale 0 no desktop), toque real (`pointer: coarse` só pela largura), leitor de tela, movimento reduzido no confete, Supabase real

---

## Critérios Negativos (NÃO DEVE)

- [x] **AC-N0:** Nenhuma funcionalidade existente removida — fluxos de sorteio, Top 10, busca, roleta e modal exercitados nos testes acima
- [x] **AC-N1:** Testes existentes continuam passando

---

## Comandos de Verificação

```bash
npm test                         # 145/145 (12 suítes) em 2026-10-30
```

---

## Sign-off

| Critério | Status | Verificado Por | Data |
|----------|--------|----------------|------|
| AC-001 | ✅ (sem iPhone real) | Claude (Chrome) | 2026-10-28 |
| AC-002 | ✅ | Claude (Chrome) | 2026-10-28 |
| AC-003 | ✅ | Claude (Chrome) | 2026-10-28 |
| AC-004 | ✅ | Claude (Chrome) | 2026-10-28 |
| AC-005 | ✅ | Claude (git) | 2026-10-28 |
| AC-006 | ✅ | Claude (Chrome) | 2026-10-28 |
| AC-007 | ✅ (parcial — ver notas) | Claude (Chrome, teclado real) | 2026-10-28 |
| AC-008 | ✅ | Claude (Chrome) | 2026-10-28 |
| AC-009 | ✅ (sem Supabase) | Claude (Chrome + Jest) | 2026-10-28 |
| AC-010 | ✅ | Claude (Chrome) | 2026-10-28 |
| AC-011 | ✅ | Claude (Chrome) | 2026-10-28 |
| AC-012 | ✅ | Claude (Chrome, teclado e mouse reais) | 2026-10-28 |
| AC-013 | ✅ (sem leitor de tela real) | Claude (Chrome, árvore de acessibilidade) | 2026-10-28 |
| AC-014 | ✅ | Claude (Chrome + servidor ligado/desligado) | 2026-10-28 |
| AC-015 | ✅ | Claude (Chrome, clique real) | 2026-10-28 |
| AC-016 | ✅ | Claude (Chrome) | 2026-10-28 |
| AC-017 | ✅ | Claude (Chrome, 3 temas) | 2026-10-28 |
| AC-018 | ✅ | Claude (Chrome, Tab real) | 2026-10-28 |
| AC-019 | ✅ | Claude (Chrome, teclado real) | 2026-10-28 |
| AC-020 | ✅ | Claude (Chrome, teclado real) | 2026-10-28 |
| AC-021 | ✅ | Claude (Chrome, estilo computado) | 2026-10-28 |
| AC-022 | ✅ | Claude (Chrome) | 2026-10-28 |
| AC-023 | ✅ | Claude (Chrome, teclado real) | 2026-10-28 |
| AC-024 | ✅ (Supabase simulado) | Claude (Chrome, teclado real) | 2026-10-28 |
| AC-025 | ✅ (sem envio — Supabase desabilitado) | Claude (Chrome) | 2026-10-30 |
| AC-026…043 | ✅ (Supabase simulado; sem iPhone real) | Claude (Chrome) | 2026-10-30 |

---

## Notas

- 2026-10-30, T001-072 a T001-076: Jest 212, banco 15 (PGlite) e Playwright 79 passando; cabeçalho e janela de Amigos conferidos no Chrome em computador e 390px; bilhete e números conferidos no Chrome em computador. O perfil do amigo e a opção de ocultar não rodaram no Supabase real: falta a segunda conta.
- Pendente de validação humana: iPhone real (AC-001), histórico de sorteios e modal aninhado (AC-007), conquista com login (AC-009).
- Achados durante os testes viraram backlog: FR-036 (SW serve JS antigo), FR-039 (banner PWA cobre o FECHAR), `.user-pill` sem foco por teclado (FR-003).
- 2026-10-30, Supabase real: gravar em nome de outro usuário recusado (42501) em 6 tabelas (Claude); leitura entre duas contas de teste conferida e aprovada pelo usuário.
- 2026-10-30, Supabase real: "Deletar conta" com 8 tabelas preenchidas apagou o login e deixou 0 linhas em todas (conferido com o token antigo); chamada sem login recusada com 401. A limpeza da sessão local foi corrigida depois e não teve novo teste de ponta a ponta.
- 2026-10-30, Supabase falso: FR-040 com senha removida ao abrir, aviso no login, falha do banco sem perda, adiamento de 7 dias, importação sem duplicatas e chaves antigas removidas. Falta o teste real.
- 2026-10-30, Supabase real: FR-040 importou 1 em Quero Assistir e 2 em Já Assistidos, sem duplicar um título já existente nem ao repetir; vitórias 0 para 3; chaves antigas removidas; sem erros no console.
- 2026-10-30, T001-051 a T001-056: 23 testes Playwright passando; 4 erros introduzidos de propósito (roleta, repetição no sorteio, modal esperando as seções, importação apagando antes de confirmar) foram detectados. Com o TMDB real: modal abriu em 515 ms mostrando "Carregando elenco...", clima enviou 28|12 e plataformas enviou 8|119. Sintaxe de OU e exclusão de gêneros conferida na API: 20/20 com o gênero pedido, 0 com excluídos.
