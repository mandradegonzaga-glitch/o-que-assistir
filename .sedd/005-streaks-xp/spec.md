# Feature Specification: Streaks & XP System

> Feature ID: 006
> Created: 2026-03-24
> Status: Planned

## Overview

Sistema de progressão diária que incentiva o usuário a abrir o app e interagir frequentemente. Streaks (sequências de dias ativos) e XP (pontos de experiência acumulados) criam um loop de hábito. Crucial para melhorar D7 e D30 retention.

---

## Expectation

O usuário abre o app diariamente para manter seu streak, acumula XP por todas as ações relevantes, e sente progressão constante através de um nível de usuário que evolui visivelmente (Calouro → Cinéfilo → Crítico → Lenda).

---

## DEVE (MUST)

- [ ] Registrar "check-in diário" ao abrir o app
- [ ] Calcular e exibir streak atual (dias consecutivos)
- [ ] Zerar streak se o usuário ficar 48h sem abrir o app (grace period de 1 dia)
- [ ] Conceder XP por: abrir o app, marcar assistido, usar roleta, dar like no match
- [ ] Exibir XP total e nível atual no perfil do usuário
- [ ] Nível calculado em função do XP (tabela de progressão)
- [ ] Notificação push "Seu streak vai expirar!" (futuro, com push permission)
- [ ] Manter maior streak já alcançado (`best_streak`) no perfil

## NÃO DEVE (MUST NOT)

- [ ] Conceder XP por ações duplicadas na mesma sessão (ex: marcar assistido 2x)
- [ ] Zerar streak por clock skew de menos de 1 hora
- [ ] Exibir XP/streaks para usuários convidados (feature exclusiva de contas)
- [ ] Manipular timestamp do dispositivo para fraudar streak (validar no servidor)
- [ ] Tornar o sistema tão complexo que desoriente usuários casuais

---

## User Stories

### US1: Streak Diário (P1 - Critical)

**As a** usuário recorrente
**I want** ver meu streak de dias consecutivos
**So that** tenho motivação para voltar ao app diariamente

**Acceptance Criteria:**
- [ ] Streak exibido prominentemente no perfil
- [ ] Animação/destaque no primeiro acesso do dia
- [ ] Maior streak histórico exibido como record pessoal
- [ ] Badge especial ao atingir 7, 30, 100 dias de streak

### US2: Sistema de XP (P2 - Important)

**As a** usuário engajado
**I want** ganhar XP por cada ação no app
**So that** sinto que estou progredindo mesmo sem assistir todos os dias

**Acceptance Criteria:**
- [ ] XP concedido por: abrir app (+5), marcar assistido (+20), roleta (+10), match (+15)
- [ ] XP total visível no perfil com barra de progresso para próximo nível
- [ ] Histórico simplificado das últimas conquistas de XP

### US3: Níveis de Usuário (P2 - Important)

**As a** usuário de longo prazo
**I want** ver meu nível evoluir conforme uso o app
**So that** tenho senso de progressão e status

**Acceptance Criteria:**
- [ ] 6 níveis: Calouro → Aprendiz → Cinéfilo → Crítico → Maratonista → Lenda
- [ ] Nível exibido no perfil com ícone/badge do nível
- [ ] Transição de nível com celebração visual

---

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Check-in diário e cálculo de streak | P1 | 🔲 Pending |
| FR-002 | `best_streak` no perfil | P1 | 🔲 Pending |
| FR-003 | Concessão de XP por ações | P2 | 🔲 Pending |
| FR-004 | Tabela de progressão de níveis | P2 | 🔲 Pending |
| FR-005 | Exibição de streak e XP no perfil | P2 | 🔲 Pending |
| FR-006 | Badges por marcos de streak (7, 30, 100 dias) | P2 | 🔲 Pending |
| FR-007 | Notificação push de streak expirando | P3 | 🔲 Future |
| FR-008 | Leaderboard de streaks e XP | P3 | 🔲 Future |

---

## Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-001 | Validação server-side | Timestamp do check-in validado no Supabase |
| NFR-002 | Anti-fraude | Grace period de 1 dia para evitar zerar por erro de timezone |
| NFR-003 | Performance | Cálculo de streak < 200ms |

---

## Architecture Analysis

### Current Architecture (Relevant)

- **supabase-schema.sql** — Adicionar colunas em `profiles`: `current_streak`, `best_streak`, `last_checkin`, `total_xp`, `level`
- **supabase-config.js** — Novas funções: `supabaseDailyCheckin`, `supabaseGrantXP`, `supabaseGetStreakInfo`
- **script.js** — Chamar `supabaseDailyCheckin` no login/app load

### Schema Changes

```sql
ALTER TABLE profiles ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN best_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_checkin DATE;
ALTER TABLE profiles ADD COLUMN total_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN level VARCHAR(20) DEFAULT 'Calouro';
```

### XP Table

| Ação | XP |
|------|----|
| Abrir app (check-in diário) | +5 |
| Marcar título como assistido | +20 |
| Adicionar à watchlist | +5 |
| Usar roleta | +10 |
| Match Mode (participar) | +15 |
| Desbloquear badge | +25 |

### Level Progression

| Nível | XP Necessário |
|-------|--------------|
| Calouro | 0 |
| Aprendiz | 100 |
| Cinéfilo | 300 |
| Crítico | 700 |
| Maratonista | 1500 |
| Lenda | 3000 |

---

## Open Questions

- [ ] XP tem reset anual ou é acumulativo para sempre?
- [ ] Streak deve contar "abrir o app" ou "ação significativa" (marcar assistido)?
- [ ] Leaderboard público de streaks — privacidade ok para os usuários?

---

## Migrations

| Migration | Created | Status | Tasks |
|-----------|---------|--------|-------|
| - | - | - | - |

> Run `/sedd.clarify` para criar uma migração com clarificações e tarefas.
