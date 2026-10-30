# O Que Assistir? - Visão Estratégica do Projeto

**Última atualização:** 2026-01-30

> Este documento compila as visões estratégicas sobre o futuro do projeto, analisadas por duas IAs (Claude e Gemini) em colaboração com o desenvolvedor.

---

## Estado Atual do Projeto

### O que já existe (v2.7)
- Sorteio inteligente de filmes/séries com filtros
- Sistema de usuários (Supabase)
- Watchlist e histórico de vistos
- Sistema de badges/conquistas
- Temas dinâmicos (Filme/Série/Dorama)
- Histórico de sorteios + Blacklist
- PWA (instalável como app)
- Design "Cinematic Luxury"

### Números do Projeto
- 88 features futuras documentadas
- 3 arquivos principais (HTML, CSS, JS)
- Integração com TMDB API
- Backend Supabase

---

## Visão Claude (Claude Opus 4.5)

### Análise do Nome "O Que Assistir?"

**Prós:**
- Proposta clara e direta
- Fácil de lembrar
- Bom para SEO em português
- Reflete a função principal

**Contras:**
- Não transmite aspecto social
- Não transmite gamificação
- Pode parecer simplista para uma plataforma completa

**Recomendação:** Manter o nome por enquanto. Ele pode evoluir naturalmente quando o produto estiver mais maduro.

### Pontos Fortes Identificados

1. **Proposta de valor clara** - Resolver o "não sei o que assistir" é dor real
2. **Design Cinematic Luxury** - Diferencial visual forte
3. **Gamificação bem pensada** - Loop de dopamina pode criar hábito
4. **PWA** - Instala no celular sem app store
5. **Supabase** - Backend escalável e gratuito

### Preocupações/Desafios

1. **Scope Creep (88 features!)**
   - Risco: Tentar fazer tudo = não fazer nada bem
   - Solução: MVP focado, iterar baseado em feedback real

2. **Competição Estabelecida**
   - Letterboxd (reviews, social cinéfilo)
   - TV Time (tracking de séries)
   - JustWatch (onde assistir)
   - IMDb (database, reviews)

3. **Identidade do Produto**
   - O projeto está tentando ser: recomendador, tracker, rede social, jogo, ferramenta
   - Pode confundir ou ser o diferencial ("tudo em um")

4. **Monetização**
   - 88 features = muito desenvolvimento
   - Precisa de estratégia clara de sustentabilidade

5. **Onboarding**
   - Com tantas features, como não assustar novos usuários?

### Posicionamento Único Sugerido

> **"O Que Assistir?" - O app que transforma assistir filmes e séries em um jogo social.**

Diferencial: Não é só tracker, não é só rede social, não é só recomendador. É uma experiência gamificada de entretenimento.

### Foco Recomendado

**Fase 1 - Core Loop**
1. Sortear com filtros inteligentes ✅
2. Tracking de séries (episódios)
3. Streak + XP básico
4. Up Next widget

**Fase 2 - Social**
5. Match Mode (diferencial único!)
6. Compartilhar cards
7. Amigos básico

**Fase 3 - Gamificação**
8. Cine-Batalha
9. Desafios diários
10. Leaderboard

### Killer Feature Identificada

> **Match Mode para casais/grupos decidirem juntos o que assistir.**

Por que é especial:
- Problema real (briga de casal sobre o que ver)
- Divertido (swipe estilo Tinder)
- Viral (precisa convidar alguém)
- Único (nenhum concorrente tem)

---

## Visão Gemini

### Análise Geral

> "Vejo um projeto que já superou a barreira de um 'projeto de portfólio' e está entrando no território de **produto real com potencial de mercado**."

### 1. A Mudança de Identidade: De "Ferramenta" para "Hábito"

**Situação atual:** O site é uma ferramenta utilitária - pessoa entra, acha filme, sai.

**Perspectiva:** O futuro está em transformar o app em um **hábito diário**, mesmo quando a pessoa não vai assistir a um filme naquele momento.

**Como alcançar:**
- Features de Engajamento Diário (Streak, Quiz, Filme do Dia)
- Usuário abre o app no ônibus só para manter o "foguinho" do streak
- Expandir estrutura de gamificação existente (badges, userProfile)

### 2. O Pivô Social (O "Killer Feature")

**Observação:** A integração com Supabase é o divisor de águas. A maioria dos apps concorrentes são solitários.

**Anseio:**
> "Eu vejo esse projeto se tornando o **Letterboxd para pessoas normais**. O Letterboxd é muito elitista/crítico. O seu projeto é divertido, visual e gamificado."

**A Visão:**
- Match Mode (Tinder de filmes) e Listas Colaborativas usam infraestrutura realtime
- Cria viralidade orgânica: um usuário traz outro porque precisa do outro para usar

### 3. A Estética "Cinematic Luxury" como Diferencial

**Contexto:** O mercado está cheio de clones da Netflix com interface padrão.

**Perspectiva:** A estética não é apenas "bonita", ela é funcional.
- "Modo Cinema" (vermelho) e "Modo Tech" (roxo) dão senso de posse
- Variáveis CSS de glassmorphism, noise texture e accent colors mostram cuidado com beleza

**Próximo Passo:** Investir pesado em **Micro-interações** e **Sound Design**.
- O app deve ser *gostoso* de usar
- Clique no botão "Check" deve ser satisfatório (animação + som + feedback tátil)
- Isso eleva a percepção de qualidade

### 4. A Inteligência de Dados (O Poder Invisível)

**O que já existe:** Captura de histórico e blacklist.

**Anseio:** Ver o app deixando de ser passivo ("você escolhe o filtro") para ser ativo ("eu te conheço").

**O Futuro:** Usar dados para o AI Curator.
> "Imagine o app dizendo: *'Matheus, você viu muito Sci-Fi essa semana. Que tal quebrar o padrão com um Drama leve?'*. Isso cria uma conexão emocional com o usuário."

### Resumo dos Três Pilares (Gemini)

| Pilar | Descrição | Exemplo |
|-------|-----------|---------|
| **Curadoria Emocional** | Menos "Filmes de 1990", mais sentimentos | Filtro "Filmes para Chorar" |
| **Conexão Humana** | Menos "Minha Lista", mais colaboração | Match Mode, "Nossa Lista" |
| **Identidade Premium** | App lindo de ver e ouvir | Som, micro-interações, rebrand |

### Sugestão de Rebrand (Gemini)

Possíveis novos nomes mencionados:
- **LUMA** - Luz, cinema, elegante
- **KINO** - Cinema em alemão, cult, sofisticado

---

## Síntese: Visão Unificada

### Concordâncias entre Claude e Gemini

| Aspecto | Consenso |
|---------|----------|
| **Potencial** | Projeto tem potencial real de mercado |
| **Diferencial Visual** | Design "Cinematic Luxury" é ponto forte |
| **Social é Key** | Features sociais são o caminho |
| **Match Mode** | Identificada como killer feature |
| **Hábito > Ferramenta** | Transformar uso ocasional em diário |
| **Gamificação** | Loop de dopamina essencial para retenção |
| **Competição** | Posicionar como "Letterboxd para pessoas normais" |

### O Projeto Ideal (Visão Combinada)

```
┌─────────────────────────────────────────────────────────────┐
│                    O QUE ASSISTIR? 3.0                      │
│         "O app que transforma entretenimento em jogo"       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CORE: Descoberta + Tracking + Social + Gamificação         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  DESCOBERTA  │  │   TRACKING   │  │    SOCIAL    │      │
│  │              │  │              │  │              │      │
│  │ • Sortear    │  │ • Episódios  │  │ • Match Mode │      │
│  │ • Vibe Filter│  │ • Up Next    │  │ • Listas     │      │
│  │ • AI Curator │  │ • Calendário │  │ • Amigos     │      │
│  │ • CineTok    │  │ • Progresso  │  │ • Comparar   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │                 GAMIFICAÇÃO                       │      │
│  │                                                   │      │
│  │  Streak • XP • Níveis • Badges • Desafios        │      │
│  │  Cine-Batalha • Quiz • Leaderboard • Rewards     │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
│  DIFERENCIAL: Estética Premium + Viralidade Social          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Prioridade de Desenvolvimento

1. **Imediato:** Tracking de Séries + Up Next (retenção)
2. **Curto prazo:** Match Mode (viralidade)
3. **Médio prazo:** Gamificação completa (engajamento)
4. **Longo prazo:** AI Curator + CineTok (diferenciação)

### Métricas de Sucesso

| Métrica | Meta Inicial | Meta 1 Ano |
|---------|--------------|------------|
| Usuários cadastrados | 1.000 | 50.000 |
| Usuários ativos/mês | 300 | 15.000 |
| Retenção D7 | 20% | 40% |
| Retenção D30 | 10% | 25% |
| Conversão Premium | - | 3-5% |
| NPS | - | > 50 |

---

## Perguntas em Aberto

Questões para o desenvolvedor refletir:

1. **Objetivo Principal**
   - Portfólio pessoal?
   - Produto real com usuários?
   - Startup/negócio?
   - Aprendizado técnico?

2. **Tempo Disponível**
   - Quantas horas/semana para o projeto?
   - Prazo para próxima versão?

3. **Recursos**
   - Trabalho solo ou equipe?
   - Orçamento para APIs pagas?
   - Capacidade de marketing?

4. **Escopo**
   - Focar em poucas features polidas ou muitas features básicas?
   - Lançar rápido e iterar ou desenvolver "completo"?

5. **Público**
   - Brasil apenas ou internacional?
   - Nicho (cinéfilos) ou mainstream?
   - Faixa etária alvo?

---

## Conclusão

Ambas as análises convergem em pontos cruciais:

> **O projeto tem base técnica sólida e diferencial visual. O próximo passo é construir a "alma" - transformar uma ferramenta útil em um hábito diário através de conexão social e gamificação.**

A feature mais promissora identificada é o **Match Mode**, por resolver um problema real de forma única e criar viralidade orgânica.

O nome "O Que Assistir?" ainda serve, mas pode evoluir conforme o produto amadurece. O foco agora deve ser:

1. **Construir o core loop de engajamento**
2. **Validar com usuários reais**
3. **Iterar baseado em feedback**

---

*"O potencial é gigante. Agora é a fase de construir a alma do projeto."* - Gemini

*"A feature Match Mode é o diferencial que nenhum concorrente tem."* - Claude
