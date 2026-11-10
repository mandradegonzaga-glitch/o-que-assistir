# Auditoria de design (2026-11-10)

Fontes: `/unslop` (auditoria pela lista de sinais, telas vistas no celular 390x844: entrada, boas-vindas, Início, sorteio, página do título) e `/hallmark` `sloplint` em `index.html` + `style.css` (198 FAIL, 132 REFLEX, 38 WARN). Cada achado foi conferido contra o `DESIGN.md`.

**Veredito do unslop: pouca "cara de IA" → modo polimento.** A direção (DESIGN.md) fica; corrigir só o que está abaixo. Não vistas em print: Roleta, Match, Biblioteca, perfil e DNA (o sloplint cobre o CSS delas).

Marque `[x]` quando aplicado.

## Aplicar (alinhado ao DESIGN.md)

- [ ] **A1. Letreiro em botões.** `.btn-main`, `.btn-login`, `.btn-outline`, `.btn-danger`, `.btn-guest` usam a fonte de letreiro em MAIÚSCULAS espaçadas ("Entrar", "Entrar como Convidado", "Começar", "Sortear outro") → fonte de texto, frase normal. **A decidir:** o SORTEAR AGORA (com recorte de ingresso) conta como momento e fica?
- [ ] **A2. Rótulos em MAIÚSCULAS espaçadas** (13): `.section-title` ("OUTROS JEITOS DE ESCOLHER"), `.home-card__kind`, `.card__label`, `.battle__stage-name`, `.battle__champion-label`, `.blind__eyebrow`, `.episodes-section__label`, `.episodes-status-badge`, `.challenge__label`, `.dna__months-title`, `.chip-field__label`/`.more-filters__label`, `.bottom-nav__draw-label` → frase normal, sem espaçamento. Ficam: `.draw-ticket__stub` ("ADMITE UM", é o ingresso) e o código do Match ao vivo.
- [ ] **A3. Brilho colorido na moldura:** `.user-pill:hover`, `.btn-main:hover`, `.result-item:hover`, `.empty-state-cta:hover`, `.scroll-top-btn:hover` (`--shadow-glow`) e o degradê amarelo→roxo do `.avatar` ("?" do topo) → sombra neutra / cor lisa. Fica: `.roulette-center` (a roleta é momento).
- [ ] **A4. Amarelo demais na moldura.** Ícones de "Outros jeitos de escolher" em amarelo → cor do texto; os dois links "Como funciona(m)?" amarelos sublinhados → texto secundário; botão "voltar ao topo" amarelo disputa com o Sortear da barra → superfície neutra.
- [ ] **A5. Texto.** "Inteligente(s)", "algoritmo", "filtros avançados" (boas-vindas, "Filtros Inteligentes", meta description) → concreto ("Filtros"). 31 de 121 avisos terminam em "!" → sem exclamação, menos celebração. Maiúsculas no meio: "Criar Conta", "Já Vi", "Entrar como Convidado", "Girar Roleta!" → frase normal.
- [ ] **A6. Animação que mexe em largura/altura** (10): `.password-strength-bar`, `.onboarding-dot`, `.loading-bar` + `@keyframes loading-progress`, `.up-next-card__progress-bar`, `.badges-progress__fill`, `.dna__genre-fill`, `.dna__month-fill` → `transform: scaleX/scaleY`. Foco: anel do `input:focus` tem transição (deve ser instantâneo) e `.input-dark:focus` usa borda → `outline`.
- [ ] **A7. Passar o mouse.** Subir + sombra em 9 seletores (`.card`, `.btn-main`, `.user-pill`…) e `scale(1.05)` em 3 → só cor/superfície (DESIGN: hover é troca de cor).
- [ ] **A8. Números:** `.stat-card__value` sem `tabular-nums`.
- [ ] **A9. Cartão "Filtros"** recolhido tem uma faixa vazia entre "Nenhum filtro: vale tudo" e "Como funcionam?".
- [ ] **A10. `overflow-x: hidden` no `body`** → `clip` (o `hidden` quebra `position: sticky`, usado nas abas do título).
- [ ] **A11. Espaçamento fora da grade de 4:** 83 valores (6, 10, 14px…) e 37 que já têm token `--space-*` → trocar por tokens, em lote, conferindo prints antes/depois.
- [ ] **A12. Baratos:** aviso (`.toast`) com faixa colorida só à esquerda → borda fina toda; aspas retas → “ ” e "..." → "…" nos textos visíveis.

## Bugs achados no caminho (não são estilo)

- [x] **B1.** Página do título mostra trailer removido do YouTube ("Vídeo indisponível", ex.: A Viagem de Chihiro).
- [x] **B2.** "Onde assistir" repete o serviço: Netflix e "Netflix Standard with Ads" lado a lado.
- [x] **B3.** Rodapé com endereço provisório: "Apoiar" ia para a página inicial do buymeacoffee.com e "Feedback" para `contato@app.com`. Os dois links saíram (com os ícones); **voltam quando o dono tiver os endereços reais**.
- [x] **B4.** `index.html:720`: `<img>` sem `src`.
- [x] **B5.** Sobra de 09/11: `.claude/worktrees/agent-a77e0d53` (cópia antiga, ignorada pelo git) pode ser apagada.

## Recusar (contradiz o DESIGN.md ou não se aplica)

- Fundo cinza neutro no lugar do roxo-noite: decisão do dono.
- Carimbo do hallmark no CSS (FAIL 20): decidido não usar.
- Branco puro no texto (`--text-primary`, 48 REFLEX 7b): é o contraste máximo da sala escura; opinião do hallmark.
- Emoji nas reações (8 FAIL 30a): exceção até a etapa 5e.
- 1494 palavras na página (limite 450): conta o guia "Como usar" escondido.
- Pílula em avatares e barras (F7): são redondos por natureza.
- Vidro na barra de baixo e nas ações do título: barra flutuante aprovada (PrimeVision); ações do título ficam sobre o fundo do pôster, que é momento.
- "App ocupa a tela toda" (unslop): o app é celular primeiro, container de 960px.
- Boas-vindas ("Bem-vindo!", "Começar" em todo passo): vai ser trocada na 5d (primeira visita); só o texto da A5 entra antes, se quiser.

## Adiar

- 137 cores escritas fora dos tokens (FAIL 48), quase todas brancos translúcidos. Vale juntar em tokens (`--border-*`, `--overlay-*`) numa passada própria, sem mudar o visual.
