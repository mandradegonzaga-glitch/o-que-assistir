# DESIGN.md: O Que Assistir

Sistema visual do app. **Este arquivo decide** quando uma skill de design (`/unslop`, `/hallmark`, `frontend-design`, skills do Emil) sugerir algo diferente: o que está aqui ganha. Mudar uma regra daqui é decisão do dono do projeto, não de uma auditoria.

**Os valores moram no `:root` de `src/styles/style.css`.** Aqui ficam só os nomes dos tokens e as regras de uso, para não haver dois lugares com o mesmo número. Se um valor mudar, muda lá.

Direção decidida nas varreduras do Dribbble (2026-11-06 a 08) e nas etapas 1 a 5 do redesign.

## Produto e personalidade

- **Produto:** ajuda uma pessoa (ou um casal, ou amigos) a decidir o que assistir hoje: filme, série ou dorama, com sorteio, Match, listas e indicações.
- **Personalidade:** noturno, divertido e decidido. O app escolhe por você, sem cerimônia.
- **Mundo:** uma sala de cinema à noite: ingresso, canhoto, letreiro, a luz da tela no escuro.
- **Momentos** (onde a cor e o capricho moram): o pôster e o fundo ambiente com a cor dele, a revelação do sorteio (baralho de ingressos), o ingresso gerado, o Deu Match! e o cartão do Perfil de gosto.
- **Assinatura:** o ingresso: cantos recortados, canhoto, picote. Aparece no sorteio, no ingresso compartilhado e no Perfil de gosto, e não vira enfeite em outros lugares.

## Cor

- **Fundo roxo-noite (decisão do dono, 2026-11-10).** `--bg-primary` → `--bg-secondary` → `--bg-tertiary` → `--bg-card` → `--bg-elevated` formam a rampa. É a "sala escura" e fica, mesmo que uma auditoria peça cinza neutro.
- **Texto:** `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted` (o muted só para metadados, sempre ≥ 4,5:1).
- **Um destaque por tipo**, trocado por `[data-theme]`: filme = amarelo de bilheteria, série = luz de tela (turquesa), dorama = flor de cerejeira (rosa). Usar sempre `--accent-primary` / `--accent-text` / `--accent-on`, nunca a cor escrita. O destaque marca a ação principal, a seleção e o número que importa. Não pinta superfícies.
- **Verde** (`--accent-success`) só para estado bom ("Já vi" marcado, sucesso).
- **Bordas:** `--border-subtle` / `--border-default` / `--border-strong`, linhas finas.
- **Brilho e degradê (decisão do dono, 2026-11-10): só no conteúdo.** Liberado no fundo ambiente com a cor do pôster, no ingresso, no sorteio e no Deu Match!. Na moldura (botões, barras, cartões, abas, gavetas) **não há brilho colorido** (`--shadow-glow`) nem degradê de uma cor para outra. Profundidade vem de degrau de fundo + linha fina + as sombras neutras `--shadow-*`.
- Nada de degradê roxo → azul, texto em degradê ou mancha de cor atrás do conteúdo.

## Tipografia

- **Texto:** `--font-family` (Hanken Grotesk), pesos 400 e 500; 700 só para ênfase rara.
- **Letreiro (decisão do dono, 2026-11-10):** `--font-display` (Big Shoulders Display, 700 a 900, maiúsculas permitidas) **só nos momentos**: marca, ingresso e canhoto, revelação do sorteio, Deu Match! e títulos de seção. **Proibido** em rótulos, botões, abas, pílulas e metadados: esses vão na fonte de texto, em frase normal, sem espaçamento extra.
- Sem itálico para ênfase (hoje há 0 usos).
- Números com `font-variant-numeric: tabular-nums` quando ficam em coluna ou contam.
- Espaçamento negativo só em texto grande (`--letter-spacing-tight` a partir de ~32px). Texto pequeno fica com 0.

## Ícones

- **Phosphor**, gerados por `scripts/build-icons.mjs` em `src/ui/phosphor.js` (`ph()`, `data-ph`). Peso: duotone = destaque, regular = interface, bold = ≤16px, fill = ativo (regra no script).
- Desenhos próprios só onde o Phosphor não tem: roleta (`scripts/icons-custom/`), marca/ingresso e QR.
- **Nenhum emoji como ícone.** Exceção temporária: as reações, até a etapa 5e (selos ilustrados). O emoji que o banco guarda nas listas é traduzido por `src/ui/listIcons.js`.
- O ícone herda a cor do papel do texto; ícone colorido só quando é estado (Já vi verde, Salvar aceso).

## Espaço, raio e layout

- Espaço: `--space-xs` … `--space-2xl` (grade de 4). Valor solto só para centralizar algo de fato.
- Raio: `--radius-sm` / `-md` / `-lg` / `-xl`; pôster `--radius-poster`. Raio interno = externo − espaço entre eles.
- **Celular primeiro.** Conteúdo centralizado e limitado em `.container` (960px); no computador as margens crescem, a grade não. (Decisão: não seguir a regra do unslop de "app ocupa a tela toda", que vale para painel de trabalho, não para este app.)
- Barra flutuante embaixo com Sortear no centro; o canto inferior direito tem arranjo próprio (ver fim do `style.css` e o teste que mede os pares).
- Gavetas (`src/ui/sheet.js`) no lugar de janelas centrais.

## Componentes e detalhes

- **Bolinha de status (decisão do dono, 2026-11-10): só quando informa.** Amigo online, Match ao vivo, novidade não vista. Nunca como enfeite.
- Pílulas para filtros e tipos; cartões sem cartão dentro de cartão.
- Esqueletos no formato exato da tela que vai chegar.
- Foco visível em todo elemento interativo (`:focus-visible`), sem atraso.

## Movimento

- Curvas: `--ease-out` (padrão, saída forte), `--ease-in-out` (algo que já está na tela muda de lugar), `--ease-drawer` (gavetas). `--ease-bounce` só em celebração (Deu Match!, conquista).
- Durações: `--duration-fast` / `-normal` / `-slow`. Entradas grandes (sorteio, baralho) podem passar disso, porque são momentos.
- Animar só `transform`, `opacity`, cor e filtro curto. Nunca `transition: all`, nunca largura/altura/top/left.
- `:hover` só dentro de `(hover: hover) and (pointer: fine)`. Apertar = `scale(0.97)`.
- **Reduzir movimento:** mais suave, não zero; o sorteio abre direto.
- Nada que pisca ou pulsa sem estar "ao vivo".

## Texto (pt-BR)

- Frases curtas e concretas; o título diz o contexto, sem saudação.
- Sem ponto final em rótulo, botão e título curto.
- Exclamação só em celebração (Deu Match!, conquista).
- Sem número ou depoimento inventado; dados de exemplo plausíveis.
- Toda funcionalidade nova entra no guia "Como usar" (`#modal-help`).

## Regras para as skills

- **`/unslop`:** usar em tela que já existe, sempre no **modo polimento** (manter esta direção). Mostrar a auditoria antes de editar.
- **`/hallmark`:** usar `audit` (relatório) ou em tela nova. **Sem o carimbo no CSS**, sem tema sorteado e sem `tokens.css` próprio: os tokens são os do `style.css`.
- **Achado que contradiz este arquivo:** recusar e anotar o motivo, sem aplicar. Se parecer que a regra daqui está errada, levar ao dono.
- Antes de mudar algo visual: perguntar sobre captação no Dribbble.
