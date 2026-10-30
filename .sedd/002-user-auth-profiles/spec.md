# Feature Specification: User Auth & Profiles

> Feature ID: 002
> Created: 2026-03-24
> Status: Implemented

## Overview

Sistema de autenticação e perfil de usuário via Supabase Auth. Permite registro, login, logout, modo convidado e gerenciamento de preferências persistidas na nuvem com sincronização entre dispositivos.

---

## Expectation

Qualquer usuário consegue criar uma conta, fazer login e ter seus dados (listas, badges, preferências) sincronizados entre dispositivos automaticamente. Usuários sem conta podem usar o app como convidado com limitações claras.

---

## DEVE (MUST)

- [x] Registro com email/senha
- [x] Login com email/senha
- [x] Logout seguro (limpar sessão local)
- [x] Modo convidado (anonymous login via Supabase)
- [x] Persistir preferências do usuário (tema, último modo, última aba)
- [x] Exibir perfil com nome, email, avatar gerado por iniciais
- [x] Exibir estatísticas no perfil: filmes assistidos, badges, roulette wins
- [x] Row Level Security (RLS) — usuário acessa apenas seus próprios dados
- [x] Sincronização automática entre dispositivos
- [x] Recuperação/troca de senha via email

## NÃO DEVE (MUST NOT)

- [ ] Armazenar senha em texto plano (delegar ao Supabase Auth)
- [ ] Permitir acesso a dados de outros usuários (RLS obrigatório)
- [ ] Perder dados ao fazer logout e login novamente
- [ ] Bloquear uso do app para usuários não autenticados (oferecer convidado)
- [ ] Expor service_role key do Supabase no frontend

---

## User Stories

### US1: Registro e Login (P1 - Critical)

**As a** novo usuário
**I want** criar uma conta com meu email
**So that** meus dados ficam salvos e sincronizados em qualquer dispositivo

**Acceptance Criteria:**
- [x] Formulário de registro valida email e força senha segura
- [x] Login redireciona para o app com estado carregado do Supabase
- [x] Mensagem de erro clara para credenciais inválidas

### US2: Modo Convidado (P2 - Important)

**As a** usuário que não quer criar conta
**I want** usar o app sem registro
**So that** posso experimentar antes de me comprometer

**Acceptance Criteria:**
- [x] Botão "Entrar como convidado" funcional
- [x] Dados do convidado salvos temporariamente via anonymous session
- [ ] Oferecer migração de dados ao criar conta depois (pendente)

### US3: Perfil e Estatísticas (P2 - Important)

**As a** usuário registrado
**I want** ver meu perfil com histórico e conquistas
**So that** acompanho meu progresso e engajamento no app

**Acceptance Criteria:**
- [x] Avatar gerado automaticamente pelas iniciais do nome
- [x] Contador de filmes/séries assistidas exibido
- [x] Badges desbloqueadas listadas no perfil
- [x] Roulette wins exibido como stat

---

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Registro com email/senha | P1 | ✅ Done |
| FR-002 | Login com email/senha | P1 | ✅ Done |
| FR-003 | Logout | P1 | ✅ Done |
| FR-004 | Anonymous login (convidado) | P2 | ✅ Done |
| FR-005 | Persistência de preferências | P2 | ✅ Done |
| FR-006 | Perfil com stats | P2 | ✅ Done |
| FR-007 | Troca de senha | P3 | ✅ Done |
| FR-008 | Migração dados convidado → conta real | P3 | 🔲 Pending |
| FR-009 | Login social (Google/GitHub) | P3 | 🔲 Pending |

---

## Non-Functional Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| NFR-001 | Segurança | RLS ativo em todas as tabelas de usuário |
| NFR-002 | Sessão persistente | Recarregar página mantém login |
| NFR-003 | Carregamento do perfil | < 2s após login |

---

## Architecture Analysis

### Current Architecture (Relevant)

- **supabase-config.js** — `supabaseRegister`, `supabaseLogin`, `supabaseLogout`, `supabaseLoginAsGuest`, `supabaseGetProfile`, `supabaseUpdatePreferences`, `supabaseOnAuthStateChange`
- **script.js** — listener de auth state que reconstrói UI ao detectar mudança
- **supabase-schema.sql** — Tabelas: `profiles`, `user_preferences`, `user_badges`

### Patterns to Follow

- `supabaseOnAuthStateChange` como ponto central de reação a mudanças de sessão
- Funções helper em `supabase-config.js` para todas as operações, nunca chamar Supabase diretamente no `script.js`

---

## Open Questions

- [ ] Login social (Google/Apple): prioridade para reduzir fricção de registro?
- [ ] Migração de dados do convidado: usar `supabase.auth.linkIdentity()` ao converter para conta?

---

## Migrations

| Migration | Created | Status | Tasks |
|-----------|---------|--------|-------|
| - | - | - | - |

> Run `/sedd.clarify` para criar uma migração com clarificações e tarefas.
