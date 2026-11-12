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

- 2026-11-03, T001-097 (canto inferior direito, achado do usuário): Playwright 139 (2 novos: "no computador/no celular, os elementos do canto não se cobrem", com a faixa de instalação de verdade via `beforeinstallprompt` + 30 s no relógio falso, aviso longo, "voltar ao topo" e conquista; confere cada par e que dispensar a faixa devolve o botão ao lugar). Com o CSS anterior o teste acusa aviso, faixa e o X da faixa sobre o botão (e, no celular, topo e conquista). No caminho apareceram e foram corrigidos: aviso sobre a faixa, conquista sobre a faixa, conquista sobre o "voltar ao topo" no celular e aviso longo encostando na conquista a 1280px. No Chrome a 390px: faixa embaixo, ✨ e "voltar ao topo" acima. Evidência: `evidence/45-canto-celular.png`.
- 2026-11-06, T001-118 (episódios do convidado para a conta): Jest 396 (6 novos em `legacyData.test.js`: chaves viram temporada/episódio, dorama e tipo inválido, chaves quebradas/de outra série/repetidas/série vazia, armazenamento corrompido, entra no `collectLegacyData` e no `hasLegacyData`). Playwright 192 (pergunta cita "1 em Quero Assistir e o progresso de 2 séries"; banco recebe os 3 episódios com tipo certo e o aparelho é limpo; Em Andamento da conta mostra as 2; falha no banco mantém `guest_episodes`). Supabase real: a chave única existe e, como usuário logado numa transação desfeita, inserir 1-2 e depois 1-3 deixou 3 linhas (repetido ignorado, RLS permite); nada sobrou depois.
- 2026-11-06, T001-117 ("Vi até aqui" e sem "Marcar série"): Playwright 190 (convidado: até T01E02 marca 1 e 2, deixa o 3, "Assistindo", "Já Vi" ativo, foco no mesmo botão, Em Andamento com T01E03; conta: até o último grava 3 sem repetir e conclui com "Como foi?"; com mouse, opacidade 0 e 1 ao passar por cima; botão "Marcar série" não existe mais). Jest 390, banco ok, lint ok. Chrome com TMDB real (Breaking Bad, convidado): "Vi até aqui" em T03E04 marcou 7 + 13 + 4 = 24 episódios, 4/13 na 3ª temporada, foco mantido. Celular 390px com toque: botões em 2 linhas, "Vi até aqui" visível, sem rolagem lateral. Evidência: `evidence/71-vi-ate-aqui-computador.jpg`, `evidence/72-vi-ate-aqui-celular.png`.
- 2026-11-06, T001-116 ("Já Vi" marca todas as temporadas): Playwright 187 (convidado: "Já Vi" deixa 3/3, Concluído e os nomes; conta: 3 episódios gravados sem repetir; dorama: vai para DORAMAS (1), reaberto pela biblioteca continua com os 3 marcados e `media_type` dorama). Jest 390, banco ok, lint ok. Chrome com TMDB real como convidado: Breaking Bad, "Já Vi" marcou os 62 episódios em 1,8 s; Temporada 5 com 16/16 e os nomes ("Viva Livre ou Morra", "Madrigal"…). Evidência: `evidence/70-ja-vi-marca-todas-temporadas.jpg`.
- 2026-11-06, T001-115 (séries: episódios e "Já Vi"): Playwright 186 (novo `series.spec.js`: convidado vê Temporada 1 e 3 episódios, marca um, "Assistindo", aparece em Em Andamento com T01E02 e continua depois de recarregar; "Já Vi" com 1 episódio vira JÁ VISTO, abre o "Como foi?", reação gravada e série sai de Em Andamento; marcar temporada conclui sozinha e "Desmarcar série" volta para "Já Vi" e esconde o "Como foi?"; com conta, "Já Vi" sem episódios grava `tv` no histórico e mostra "Seus amigos veem"). Jest 390, banco ok, lint ok. Chrome com TMDB real como convidado: Breaking Bad com 5 temporadas e 7 episódios na 1ª, "Já Vi" ativo; ao tocar, JÁ VISTO e "Como foi?". Evidência: `evidence/68-serie-temporadas-convidado.jpg`, `evidence/69-serie-ja-vi-como-foi.jpg`.
- 2026-11-06, T001-114 (trilha e Voltar na batalha): Jest 390 (trilha de 8 e de 4, feito/atual/falta). Playwright 182 (trilha acompanha cada duelo e destaca a fase; Voltar some sem nada para desfazer, desfaz entre quartas e semi, volta do campeão para a final e deixa escolher outro; Nova batalha zera). Chrome com TMDB real: "duelo 4 de 4" com 3 marcas feitas e a 4ª atual, no computador e no celular. Evidência: `evidence/66` e `67`.
- 2026-11-06, T001-113 (sinopse na batalha): Playwright 179 (com mouse: aparece ao passar por cima, sem votar, sem botão "Sinopse"; celular com toque: "Sinopse" abre e fecha sem votar, tocar no pôster vota, a dupla seguinte começa fechada). TMDB real no celular e no computador. Evidência: `evidence/64` e `65`.
- 2026-11-06, T001-111 e T001-112 (guia e topo): Playwright 177 (? abre o guia fechado e devolve o foco; "Como funcionam?" abre só o tópico dos filtros, com foco; rodapé abre; resumo dos filtros na batalha; topo de 320 a 480px). Achado: o tópico ficava cortado no alto porque o painel entra deslizando; agora rola depois da animação. Evidência: `evidence/62-como-usar.png`, `evidence/63-cabecalho-360.png`.
- 2026-11-06, T001-104 a T001-110 (extras): Jest 388 (janela de lançamentos, URL com e sem dorama, título latino, país na URL e no filtro, gêneros da surpresa, sinopse sem o título, duração e década, mata-mata de 8 e de 4, ângulos do 3D). Playwright 173 (lançamentos de filme e dorama, vazio; surpresa com Faroeste e reserva; às escuras sem título nem imagem, revelar e "outro"; país no sorteio, Top 10, lançamentos e link, desligado em Dorama; batalha completa e de 4, poucos títulos; 3D inclina e volta, nada com "reduzir movimento"). TMDB real no Chrome: lançamentos de filme (Toy Story 5, Apocalipse Z…), séries e doramas; surpresa "Crime" → Laranja Mecânica; às escuras escondeu "Avatar Aang" (achado: a sinopse citava a parte antes dos dois-pontos; corrigido); batalha com 7 escolhas no celular e no computador. Evidência: `evidence/57` a `61`.
- 2026-11-06, T001-093 (reações): Jest 365. Banco (PGlite, 18): só no próprio histórico, só as 4 válidas, sem login negado, UPDATE direto continua barrado, amigo vê a reação, null tira; `reactions.sql` e `friends.sql` rodam de novo e em qualquer ordem. Supabase conferido depois da migração (coluna, CHECK, anon sem acesso, perfil com reação). Playwright 160 (convidado: "Já vi" mantém aberto e foca "Amei"; trocar, tirar, selo e nome lido em "Já assistidos", guardado depois de recarregar; conta: grava no histórico, falha volta e avisa; perfil do amigo com selo). Ajustado `guest.spec`: fecha o título antes de recarregar (aberto, o endereço o reabre). Evidência: `evidence/55-reacoes-titulo.png`, `evidence/56-reacoes-biblioteca.png`.
- 2026-11-06, T001-103 (ponta do aviso na borda): teste novo a 453, 600 e 1280 px com aviso comprido; falha sem a correção (aviso continua visível) e passa com ela. Playwright 156, Jest 363.
- 2026-11-06, T001-096 (indicações pelo DNA): Jest 363 (perfil só com 5+ títulos; gêneros com peso; tradução para série somando Ação+Aventura; Terror/Romance pulados em série; animação fora; corte de metade do peso; rodízio diário; vistos ficam de fora; chave muda só quando o rodízio muda). Playwright 153 (só terror: filme de terror com "Porque você curte Terror" e série/dorama padrão; 4 títulos: padrão; TMDB vazio para o gênero: tenta a página 1 e volta ao padrão). TMDB real (Chrome): perfil de ação → No Limite do Amanhã, Jornada nas Estrelas: A Nova Geração, Extraordinária Você; perfil de terror → Eu Vi o Diabo + série e dorama padrão. Evidência: `evidence/53-indicacoes-dna-acao.png`, `evidence/54-indicacoes-dna-terror.png`.
- 2026-11-06, T001-092 (comparar gostos): Jest 350 (interseção 100/0/33%, simétrica, gêneros de série juntados, 3 gêneros em comum no máximo, "assiste mais" só com diferença de 10 pontos, mínimo de 3 títulos, filme e série com o mesmo id não se confundem). Banco (PGlite, 17): o perfil do amigo traz `genres`. Playwright 150 (porcentagem, frase e títulos em comum; poucos títulos explica o que falta; servidor sem `genres` esconde só a porcentagem). Sem rolagem lateral a 390 e 1280 px. Evidência: `evidence/51-comparar-gostos.png`, `evidence/52-comparar-gostos-celular.png`.
- 2026-11-07, T001-126 (Parecidos e "Nos cinemas"): Jest +9 (`cinemaRelease.test.js`: estreia futura, ano seguinte, em cartaz, digital já lançado, digital futuro, mais de 75 dias, limitado sem amplo, amplo antes do limitado, sem dados do Brasil) e Playwright +3 (`titlePage.spec.js`: estreia em 10 dias mostra DD/MM; estreia há 5 dias mostra "Nos cinemas"; série não pede `release_dates` e segue "Indisponível em streaming"). No Chrome (site local, convidado, TMDB real): "Parecidos" e "Elenco" com `scrollbar-width: thin` e a mesma cor; *Vingadores: Doutor Destino* (estreia 16/12) e *Godzilla Minus Zero* (estreou 05/11) com a pílula certa; *Street Fighter* (digital BR em 11/11) segue "Nos cinemas" até essa data.
- 2026-11-07, T001-127 (ingresso novo): Playwright: "cor do ingresso segue o tipo" passou a contar os pixels da cor do tipo no ingresso inteiro (selo e marca); +2 em `share.spec.js` (com cena e elenco, só a cena é baixada; só elenco baixa as fotos e o canvas segue exportável; série sem imagem pega a 1ª cena com imagem da temporada 1). Conferido em imagens geradas com dados reais do TMDB: paisagem (Duna: Parte Dois, Breaking Bad), só pôster (O Senhor dos Anéis, pôster inteiro e título sem artigo solto), cena de episódio, mosaico do elenco e sem imagem (dorama, ícone de TV sem encostar no título). Jest 432, e2e 217.
- 2026-11-07, T001-128 (etapa 3): Playwright: novo `navigation.spec.js` (barra troca de tela e marca a atual com URL; Sortear sempre no centro e sorteia da Biblioteca; fim da página acima da barra; Biblioteca como aba do topo no computador e restaurada ao recarregar; "Continue assistindo" com T01E02 e "Ver tudo" em Em Andamento; tocar abre os episódios; sem série, a fileira some); `dailyPicks.spec.js` refeito para a fileira (no fim do Início, 3 cabem na largura do celular, sem TMDB some) e canto inferior direito com a barra (celular e computador); `friends.spec.js` confere os 5 botões da barra inteiros em 360px. Conferido em prints (390x844 e 1280x800, convidado, TMDB real). Jest 432, e2e 223.
- 2026-11-07, T001-129 (etapa 4): Playwright novo `filters.spec.js` (13: escolher e desfazer; gênero e clima se excluem; "Ver todos" e escolhido sempre à vista; setas; logos e nomes; Natal pede with_keywords=207317; recolhidos com resumo e estado lembrado; contador do "Mais filtros"; link com país abre tudo; busca antes do sorteio com resultados logo abaixo; Top 10/Lançamentos abrem e fecham e "Fechar"; mudou o filtro → atualiza; tocar várias vezes não acumula nada no botão). Jest +3. Conferido em prints (390x844 e 1280x800, TMDB real: Top 10 de Natal com O Estranho Mundo de Jack, Esqueceram de Mim 2, O Grinch, Expresso Polar). Jest 435, e2e 236.
- 2026-11-05, T001-101 ("Outros" sem barra): Jest 341 (`otherNamesText`: 1, 2, 5, 6 e 7 nomes; `genreDna` guarda os nomes de Outros na ordem do ranking). Playwright 147 (a linha Outros é "Outros 6% Comédia", sem barra). No Chrome com 7 títulos reais: "Outros 28%: Ação, Animação, Aventura, Comédia, Família e Fantasia", sem rolagem lateral a 1280 e 390 px. Achado e corrigido: a primeira versão escrevia "e mais 1". Evidência: `evidence/50-dna-outros.png`.
- 2026-11-05, T001-099 (horas e ator mais visto): Jest 340 (16 novos em `lifeStats.test.js`: chave filme/série, resumo do TMDB com 5 do elenco, média do episódio e teto, durações vazias, validade de 30 dias para série, minutos por filme e por episódios marcados, ator em 2+ títulos com desempate por nome, série em andamento fora do ator, duplicatas, formato "1.250 h", só os que faltam). Playwright 147 (4 novos em `tasteDna.spec.js`: 3 filmes + série e dorama inteiros = 11 h e Atriz Teste em 5 títulos, 5 pedidos com `append_to_response=credits` e nenhum ao recarregar; sem TMDB mostra "—" e o resto do DNA continua; um título só, "Ninguém apareceu em 2 títulos ainda"; com conta, 2 episódios de série em andamento somam e sair da conta apaga `title_facts`). O TMDB falso dos testes agora devolve duração e elenco. Três rodadas completas seguidas sem falha. No Chrome com TMDB real (convidado, 7 títulos): 61 h, Sigourney Weaver em 2 títulos, 1,4 s na primeira abertura e nenhum pedido ao reabrir, sem erros e sem rolagem lateral a 1280 e 390 px. Achado e corrigido: com teto de 90 min as horas davam 75 h (Stranger Things inflado pelo episódio final de 129 min); teto passou a 70 min (D001-034). Evidência: `evidence/48-dna-horas-ator.png` e `evidence/49-dna-horas-ator-celular.png`.
- 2026-11-05, T001-100 (testes instáveis): com os testes novos, a suíte inteira falhou em rodadas diferentes no ingresso ("Gerando…" visto em 400 ms) e no Match ao vivo (código da sala lido vazio; falhou 1 em 6 rodando sozinho). Sem as mudanças, a suíte passou. Corrigidos só os testes; 20 repetições dos dois e três rodadas completas passaram.
- 2026-11-05, T001-098 (DNA do usuário): Jest 324 (18 novos em `tasteDna.test.js`: gêneros por id, objeto e texto, junção dos gêneros de série, soma sempre 100, desempate estável, top 5 + Outros, sem gêneros, tipos, década com empate, meses na hora local e na virada do ano, frase em português, "ainda se formando") e Playwright 143 (4 novos em `tasteDna.spec.js`: perfil vazio convida a marcar; histórico com 5 títulos mostra "Você é 60% Terror, 10% Drama, 10% Romance, 7% Ação e 7% Aventura.", Outros, filmes/séries/doramas, Anos 80 e os 6 meses com "nenhum título"; marcar como visto atualiza; a 360px sem rolagem lateral). No Chrome (site local, convidado com 7 títulos): sem erros e sem rolagem lateral a 1280px e 390px. Achado e corrigido: no computador "Década favorita" quebrava em duas linhas e desalinhava os números; agora os números ficam alinhados pela base. Evidência: `evidence/46-dna-perfil.png` e `evidence/47-dna-celular.png`.
- 2026-11-03, T001-091 (indicações do dia): Jest 301 (10 novos em `dailyPicks.test.js`: mesmo dia igual, grupo inteiro antes de repetir, páginas existentes, dias seguidos em páginas diferentes, pedido certo por tipo, pular sem pôster e coreana na série, meia-noite local) e Playwright 135 (4 novos em `dailyPicks.spec.js`: três cartões e abrir o título, igual ao recarregar e diferente no dia seguinte, seção some sem TMDB, três lado a lado a 390 px). TMDB real: as últimas páginas usadas (10, 10 e 6) vêm com 20 títulos, todos com pôster. No Chrome em 2026-11-03: "Ela" (2013, 7,8), "Andor" (2022, 8,3) e "A Ilha" (2022, 8,1); tocar em A Ilha abriu o título; a 390 px, sem rolagem lateral. Evidência: `evidence/40-indicacoes-do-dia.jpg` e `evidence/41-indicacoes-celular.png`. Ajuste a pedido (menores no computador e resumo ao passar o mouse): Jest 306 (5 novos em `genres.test.js`), Playwright 136 (novo: largura de no máximo 170px a 1280px, gêneros e sinopse, `aria-describedby`, aparece com o mouse e com Tab). No Chrome com mouse real: cartões de 170px, seção de 421px de altura; sobre "Ela", "Romance · Ficção científica · Drama" e a sinopse. Evidência: `evidence/42-indicacoes-mouse.jpg`. Painel flutuante (D001-032): Playwright 137 (`dailyPicks.spec.js` com 6 testes: abre sozinho na primeira entrada do dia com bolinha e sem tirar o foco, não abre de novo no mesmo dia, botão reabre com foco no fechar, Esc fecha e devolve o foco, escolher fecha e abre o título, link de título não recebe o pop-up, sem TMDB nem botão nem painel, a 390px cabe na tela acima do botão). No Chrome: abriu sozinho com Ela, Andor e A Ilha. Achado e corrigido: no celular a lista rolava junto com o cabeçalho e o fechar sumia; agora só a lista rola. Evidência: `evidence/43-indicacoes-painel.jpg` e `evidence/44-indicacoes-painel-celular.png`.
- 2026-11-03, T001-090 (desafio do dia e meta da semana): Jest 291 (16 novos em `challenges.test.js`: rodízio sem repetir em 60 dias, ciclo completo, convidado sem desafio de amigos, semana de segunda a domingo e virada de ano, contagem até a meta, filtro de gênero e ano, troca de dia, os dois concluídos juntos, dados corrompidos) e Playwright 131 (4 novos em `challenges.spec.js`, com o relógio fixado: aviso ao entrar, salvar 2 conclui e paga 25 XP uma vez só, drama não conta no desafio de terror, assistir avança a meta, conta grava nos metadados). No Chrome: aviso "Desafio de hoje: Gire a roleta", cartões "0 de 1 · vale 25 XP" e "2 de 3 · vale 50 XP"; a 390 px em uma coluna, sem rolagem lateral. Evidência: `evidence/38-desafios.jpg` e `evidence/39-desafios-celular.png`.
- 2026-11-03, T001-089 (progresso nas conquistas): Jest 275 (7 novos em `badges.test.js`) e Playwright 127 (novo: "conquista bloqueada mostra quanto falta"). No Chrome, convidado com 4 vistos, recorde de 12 dias, 2 amigos e 6 indicações: Cinéfilo "4 de 10", Constante "12 de 30", Popular "2 de 5", Curador "6 de 10"; Iniciante, Foguinho, Turma e Indicador desbloqueadas sem contagem; Old School e Madrugador sem barra. Achado e corrigido: as barrinhas tinham larguras diferentes (seguiam o texto); agora todas com 126 px. Evidência: `evidence/37-progresso-conquistas.jpg`.
- 2026-10-30, T001-072 a T001-076: Jest 212, banco 15 (PGlite) e Playwright 79 passando; cabeçalho e janela de Amigos conferidos no Chrome em computador e 390px; bilhete e números conferidos no Chrome em computador. O perfil do amigo e a opção de ocultar não rodaram no Supabase real: falta a segunda conta.
- Pendente de validação humana: iPhone real (AC-001), histórico de sorteios e modal aninhado (AC-007), conquista com login (AC-009).
- Achados durante os testes viraram backlog: FR-036 (SW serve JS antigo), FR-039 (banner PWA cobre o FECHAR), `.user-pill` sem foco por teclado (FR-003).
- 2026-10-30, Supabase real: gravar em nome de outro usuário recusado (42501) em 6 tabelas (Claude); leitura entre duas contas de teste conferida e aprovada pelo usuário.
- 2026-10-30, Supabase real: "Deletar conta" com 8 tabelas preenchidas apagou o login e deixou 0 linhas em todas (conferido com o token antigo); chamada sem login recusada com 401. A limpeza da sessão local foi corrigida depois e não teve novo teste de ponta a ponta.
- 2026-10-30, Supabase falso: FR-040 com senha removida ao abrir, aviso no login, falha do banco sem perda, adiamento de 7 dias, importação sem duplicatas e chaves antigas removidas. Falta o teste real.
- 2026-10-30, Supabase real: FR-040 importou 1 em Quero Assistir e 2 em Já Assistidos, sem duplicar um título já existente nem ao repetir; vitórias 0 para 3; chaves antigas removidas; sem erros no console.
- 2026-10-30, T001-051 a T001-056: 23 testes Playwright passando; 4 erros introduzidos de propósito (roleta, repetição no sorteio, modal esperando as seções, importação apagando antes de confirmar) foram detectados. Com o TMDB real: modal abriu em 515 ms mostrando "Carregando elenco...", clima enviou 28|12 e plataformas enviou 8|119. Sintaxe de OU e exclusão de gêneros conferida na API: 20/20 com o gênero pedido, 0 com excluídos.
- 2026-11-08, T001-130 (acabamento): Playwright `navigation.spec.js` +3 (com reduzir movimento a roleta mostra o resultado em menos de 1,8 s; sem a preferência o giro segue 4 s; no celular nenhuma regra de `:hover` vale). Jest +4 (`titleSize`). Dados extremos conferidos em prints (390x844 e 1280x860) com um teste temporário (não commitado): só a página do título quebrava (corrigido). Falta conferir em celular de verdade o toque sem atraso e o hover que não prende (não aparecem em emulação). Jest 439, e2e 239 (2 oscilações de tempo na suíte inteira, passam sozinhas e 69/69 em 3 repetições).
- 2026-11-08, T001-131 (pílulas de tipo): Playwright `navigation.spec.js` +3 em 390x844, 320x640 e 1280x800. Conferido em prints nas três larguras, com Filme e com Dorama escolhidos (o print de 320px mostrou o "Dorama" cortado na primeira versão; corrigido com o ícone em cima do nome). Jest 439, e2e 242.
- 2026-11-08, T001-132 (títulos em proporção): prints com as fontes reais em 390x844, 375x667, 320x640 e 1280x800, com a posição do SORTEAR AGORA medida (390x844: 616-677px, barra em 770px). e2e 242 (os testes de largura pegaram o estouro da marca maior e do "Filtros Inteligentes" sem quebra; ambos resolvidos).
- 2026-11-08, T001-133 (gavetas): Playwright `sheets.spec.js` (7) com arraste por ponteiro; quadros da abertura (0/120/250/600 ms), do meio do arraste e do fechamento conferidos em prints com a fonte real (390x844) e a janela no centro em 1280x800. **Falta no celular de verdade:** sentir o arraste e o peteleco (emulação não reproduz toque). Jest 444, e2e 249.
- 2026-11-09, T001-134 (baralho de ingressos): Playwright `draw.spec.js` (4). Quadros a cada ~150 ms com a fonte real em 390x844 (embaralhando, virando no meio, revelado com o nome, gaveta do título subindo); o ingresso da esquerda saía da tela e o nome encostava no baralho (corrigidos e conferidos de novo). **Falta no celular de verdade:** sentir a vibração (Android; o iPhone não vibra pela web). Jest 444, e2e 254.
- 2026-11-11, T001-138 (repasse da etapa 1): Playwright novos — `dailyPicks.spec.js` (nenhum "·" fecha linha em 390px; falhou antes da correção com 5 casos), `navigation.spec.js` (4 abas inteiras em 360px; falhou antes com 376px), `titlePage.spec.js` +2 (frase acima da sinopse, "14" + 2 gêneros em pílulas, nada sem dados), `discover.spec.js` +1 (nota e "Estreia" no pôster, sem cobrir o número do Top 10). Jest +4 (`joinMeta`, `brCertification`, `isRecentRelease`, fatos com classificação). Conferido com o TMDB real em 390x844 (Indicações, Top 10, página do título com "O destino da humanidade está em suas mãos." e "14", Biblioteca em 2 colunas). Jest 440, e2e 265, 0 ciclos de import.
- 2026-11-11, T001-139 (repasse da etapa 2): Playwright novos — `series.spec.js` +2 (nome comprido inteiro e lista sem rolagem própria em 390px, falhou antes; pílulas, foto e data, próximo episódio no alto que leva aos episódios, botão que alterna, "Criação"), `discover.spec.js` +1 (link de título: boas-vindas só depois de fechar, falhou antes). Jest +8 (`seriesUpNext`, `formatDay`, `credits.js`). Conferido com o TMDB real em 390x844 (Devoradores de Estrelas: frase, sinopse, trailer, elenco com personagem, "Direção Phil Lord · Christopher Miller", "Fechar"; Breaking Bad com um episódio marcado: "Próximo: T01E01 · 61 restantes", pílulas, fotos e datas). Jest 448, e2e 268, 0 ciclos.
- 2026-11-11, T001-140: `series.spec.js` +4 (15 temporadas à vista em 1280px — falhou antes; recolher e mostrar; sinopse abre ao tocar e some sem texto; "X" no alto fecha). Conferido com o TMDB real (Sobrenatural) em 1280x900 e 390x844: X sem encostar na alça, temporadas em 4 linhas, sinopse aberta, seção recolhida. Jest 448, e2e 272.
- 2026-11-11, T001-141 (repasse da etapa 3): `library.spec.js` novo (6: cartões com contagem e "Visão geral"; leque e "reduzir movimento"; "Editar" — com mutação, a 1ª versão do teste não pegava a quebra e passou a medir `display`; filtro, "Filmes · 2" e nota; salvar pelo título guarda a nota; boneco no avatar e "Sair" no perfil fechando o perfil). `navigation.spec.js`: cartão do Continue assistindo na largura toda; abas em 2 colunas a 360px. SQL `title_rating` aplicado e conferido no Supabase (3 colunas `vote_average`, nulas). Conferido com o TMDB real em 390x844 (visão geral, lista com nota, Editar, Início). Jest 452, e2e 279, 0 ciclos.
- 2026-11-11, T001-142: `splash.spec.js` (pilha e arremesso, some sozinha, não repete na sessão; tocar pula; nada com reduzir movimento; pôsteres do aparelho), `titlePage.spec.js` +2 (disco: meio 100%, vizinho ~88%/55%, rolar troca o destaque; reduzir movimento sem transform), `disc.test.js` (4). Quadros a cada 150 ms da abertura com pôsteres reais (Devoradores de Estrelas, Resident Evil, Coração Selvagem) e prints do disco em 390x844. Jest 456, e2e 284, 0 ciclos.
