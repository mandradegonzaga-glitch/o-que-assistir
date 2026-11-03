# Feature Specification: Match Mode

> Feature ID: 005
> Created: 2026-03-24
> Status: Partially Implemented (versão local; tempo real pendente, ver 008 D001-026)

## Overview

Match Mode é a funcionalidade diferencial do app — estilo Tinder para decidir o que assistir em casal ou grupo. Dois usuários votam (❤️ ou ✕) em sugestões simultâneas, e quando ambos curtem o mesmo título, é um MATCH! Requer Supabase Realtime para sincronização em tempo real.

---

## Expectation

Dois usuários abrem uma sessão de Match, votam em sequência nos mesmos títulos, e ao detectar um match mútuo, o app celebra com animação e salva o título como escolha do grupo. Resolve o problema universal de "o que a gente assiste hoje?".

---

## DEVE (MUST)

- [x] Criar sessão de Match com link/código compartilhável (`?ao-vivo=CÓDIGO`, código de 6 caracteres sem ambíguos)
- [x] Ambos os usuários veem os mesmos títulos na mesma ordem
- [x] Votação simultânea via swipe/botões/setas com Supabase Realtime (broadcast, sem tabela)
- [x] Detectar match mútuo em tempo real e exibir celebração (quando os dois terminam)
- [ ] Salvar título matched em lista compartilhada dos dois usuários — não feito: o resultado abre o título e cada um salva na própria lista
- [x] Funcionar em mobile via PWA (touch/swipe gestures)
- [x] Sessão termina quando alguém sai (presença do Realtime); quem entra desiste após 15 s sem resposta

## NÃO DEVE (MUST NOT)

- [x] Revelar o voto de um usuário para o outro antes do match — os votos só saem do aparelho depois que os dois terminam
- [x] Requerer conta premium — funciona até como convidado
- [x] Funcionar apenas com usuários já "amigos" — link, código ou convite para amigo
- [x] Usar polling — usa canal Realtime (o "oi" de quem entra se repete a cada 2 s só até a sala responder)
- [ ] Perder votos se um usuário ficar offline momentaneamente — parcial: recarregar a página de quem entrou recomeça a votação dessa pessoa (mesmo id na sessão); a sala de quem criou não sobrevive a recarregar

---

## User Stories

### US1: Criar Sessão de Match (P1 - Critical)

**As a** usuário que quer decidir com parceiro(a) o que assistir
**I want** criar uma sessão e compartilhar o link
**So that** ambos possam votar juntos sem instalar nada extra

**Acceptance Criteria:**
- [ ] Botão "Match Mode" visível na navegação principal
- [ ] Gera link/código de 6 dígitos para compartilhar
- [ ] Segundo usuário entra pelo link sem precisar criar conta

### US2: Votação em Tempo Real (P1 - Critical)

**As a** usuário em sessão de Match
**I want** votar em filmes com swipe e ver quando há match
**So that** a decisão é tomada de forma divertida e justa

**Acceptance Criteria:**
- [ ] Cards com swipe right (❤️) e left (✕)
- [ ] Indicador de "aguardando voto do outro" quando necessário
- [ ] Animação de MATCH ao detectar coincidência mútua
- [ ] Ambos veem o mesmo card ao mesmo tempo

### US3: Resultado do Match (P2 - Important)

**As a** usuário após encontrar um match
**I want** ver o título escolhido salvo e pronto para assistir
**So that** posso adicioná-lo à watchlist de ambos imediatamente

**Acceptance Criteria:**
- [ ] Título matched exibido em celebração (confete, destaque)
- [ ] Opção de adicionar à watchlist de ambos com 1 clique
- [ ] Histórico de matches salvos para consulta futura

---

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Criação de sessão com código/link | P1 | 🔲 Pending |
| FR-002 | Supabase Realtime subscription para votos | P1 | 🔲 Pending |
| FR-003 | Lógica de detecção de match mútuo | P1 | 🔲 Pending |
| FR-004 | UI de swipe com animações | P1 | 🔲 Pending |
| FR-005 | Celebração de match (animação) | P1 | 🔲 Pending |
| FR-006 | Salvar match na watchlist de ambos | P2 | 🔲 Pending |
| FR-007 | Histórico de sessões de match | P2 | 🔲 Pending |
| FR-008 | Expiração automática de sessão inativa | P2 | 🔲 Pending |
| FR-009 | Match mode sem conta (convidado via link) | P3 | 🔲 Pending |

---

## Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-001 | Latência do realtime | Voto refletido em < 500ms |
| NFR-002 | Privacidade dos votos | Voto não visível antes do match |
| NFR-003 | Mobile-first | Swipe nativo em iOS/Android via PWA |
| NFR-004 | Confiabilidade | Sem perda de votos com reconexão |

---

## Architecture Analysis

### Current Architecture (Relevant)

- **supabase-config.js** — Base para novas funções de sessão de match
- **supabase-schema.sql** — Novas tabelas necessárias

### New Tables Needed

```sql
-- Sessões de Match
CREATE TABLE match_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(6) UNIQUE NOT NULL,
  user1_id UUID REFERENCES profiles(id),
  user2_id UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, active, completed, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes'
);

-- Votos individuais
CREATE TABLE match_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES match_sessions(id),
  user_id UUID REFERENCES profiles(id),
  tmdb_id INTEGER NOT NULL,
  vote BOOLEAN NOT NULL, -- true = like, false = skip
  voted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches confirmados
CREATE TABLE match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES match_sessions(id),
  tmdb_id INTEGER NOT NULL,
  title VARCHAR NOT NULL,
  media_type VARCHAR NOT NULL,
  poster_path VARCHAR,
  matched_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Realtime Strategy

- Supabase Realtime Broadcast para sincronizar votos sem expor dados sensíveis
- Canal por sessão: `match:${sessionCode}`

---

## Open Questions

- [ ] Usuários sem conta podem participar de match? (só via link)
- [ ] Limite de quantos títulos por sessão de match?
- [ ] O que acontece se um usuário fechar o app no meio da sessão?
- [ ] Match mode suporta mais de 2 pessoas (grupos de 3-4)?

---

## Migrations

| Migration | Created | Status | Tasks |
|-----------|---------|--------|-------|
| - | - | - | - |

> Run `/sedd.clarify` para criar uma migração com clarificações e tarefas.
