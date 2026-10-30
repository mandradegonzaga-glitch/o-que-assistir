# 🎬 Migração para Supabase - O Que Assistir

> **Nota (2026-10-28):** `script-migrations.js` e `script.js.backup` foram movidos para `../_arquivo-legacy/` (fora do projeto) — não eram carregados pelo app. Documento mantido como histórico. Ver SEDD 008, T001-014.

## 📦 Arquivos Criados

Foram criados os seguintes arquivos para ajudar na migração do localStorage para Supabase:

### 1. `supabase-schema.sql`
Schema completo do banco de dados com:
- 5 tabelas (profiles, watch_history, watchlist, user_preferences, user_badges)
- Índices para performance
- Row Level Security (RLS) para segurança
- Triggers automáticos
- Funções PostgreSQL

### 2. `supabase-config.js`
Configuração e todas as funções de integração:
- Autenticação (registro, login, logout)
- Perfil do usuário
- Histórico de filmes/séries
- Watchlist (lista de desejos)
- Preferências
- Badges/Conquistas

### 3. `script-migrations.js`
Versões atualizadas das funções do `script.js` que agora usam Supabase

### 4. `SUPABASE_SETUP.md`
Guia passo a passo completo de configuração do Supabase

### 5. `INTEGRATION_GUIDE.md`
Guia detalhado de como integrar as mudanças no código existente

### 6. `README_SUPABASE.md`
Este arquivo - resumo geral da migração

## 🚀 Início Rápido (5 passos)

### 1️⃣ Criar Projeto no Supabase (5 minutos)
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta (gratuita)
3. Clique em "New Project"
4. Preencha nome, senha e região
5. Aguarde criação do projeto

### 2️⃣ Criar Tabelas (2 minutos)
1. No Supabase, vá em **SQL Editor**
2. Copie todo conteúdo de `supabase-schema.sql`
3. Cole e clique em **Run**
4. Verifique em **Table Editor** se as 5 tabelas foram criadas

### 3️⃣ Configurar Credenciais (1 minuto)
1. No Supabase, vá em **Settings** > **API**
2. Copie **Project URL** e **anon public key**
3. Abra `supabase-config.js`
4. Cole suas credenciais:
   ```javascript
   const SUPABASE_URL = 'sua-url-aqui';
   const SUPABASE_ANON_KEY = 'sua-chave-aqui';
   ```

### 4️⃣ Atualizar Código (10-30 minutos)
1. Abra `script.js`
2. Siga o guia em `INTEGRATION_GUIDE.md`
3. Substitua as funções listadas pelas versões em `script-migrations.js`

### 5️⃣ Testar (5 minutos)
1. Abra o projeto no navegador
2. Crie uma conta
3. Adicione filme à watchlist
4. Marque filme como assistido
5. Verifique no Supabase se os dados foram salvos

## 📊 Estrutura do Banco de Dados

```
┌─────────────────┐
│    profiles     │  ← Perfil do usuário
│  - id           │
│  - username     │
│  - email        │
│  - roulette_wins│
└─────────────────┘
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌─────────────────┐
│  watch_history  │          │   watchlist     │
│  - user_id      │          │  - user_id      │
│  - tmdb_id      │          │  - tmdb_id      │
│  - title        │          │  - title        │
│  - media_type   │          │  - media_type   │
└─────────────────┘          └─────────────────┘
         │
         ├──────────────────────────────┐
         │                              │
         ▼                              ▼
┌──────────────────┐        ┌─────────────────┐
│ user_preferences │        │  user_badges    │
│  - user_id       │        │  - user_id      │
│  - last_mode     │        │  - badge_name   │
│  - last_type     │        └─────────────────┘
└──────────────────┘
```

## 🔐 Segurança

### Row Level Security (RLS)
Todas as tabelas têm RLS habilitado, garantindo que:
- ✅ Usuários só veem seus próprios dados
- ✅ Usuários só podem editar seus próprios dados
- ✅ Impossível acessar dados de outros usuários

### Autenticação
- ✅ Senhas armazenadas com hash bcrypt
- ✅ JWT tokens para sessões
- ✅ Refresh tokens automáticos
- ✅ Login anônimo para convidados

## 💾 Vantagens da Migração

| Recurso | localStorage | Supabase |
|---------|--------------|----------|
| **Capacidade** | ~5-10 MB | Ilimitado (500MB no free) |
| **Sincronização** | ❌ Não | ✅ Sim |
| **Multi-dispositivo** | ❌ Não | ✅ Sim |
| **Backup** | ❌ Manual | ✅ Automático |
| **Segurança** | ⚠️ Texto plano | ✅ Criptografado |
| **SQL Queries** | ❌ Não | ✅ Sim |
| **Real-time** | ❌ Não | ✅ Sim |
| **API REST** | ❌ Não | ✅ Sim |

## 🎯 Funcionalidades Implementadas

### ✅ Autenticação
- Registro de novos usuários
- Login com username/senha
- Login anônimo (convidado)
- Logout
- Sessão persistente

### ✅ Perfil do Usuário
- Nome e email
- Avatar (inicial do nome)
- Contador de vitórias na roleta
- Estatísticas de filmes assistidos

### ✅ Histórico
- Salvar filmes/séries assistidos
- Armazenar metadados (gêneros, ano, etc)
- Remover do histórico
- Ordenação por data

### ✅ Watchlist
- Adicionar à lista de desejos
- Remover da lista
- Separação por tipo (filme/série)

### ✅ Preferências
- Último modo usado (descobrir/roleta)
- Último tipo selecionado (filme/série/dorama)
- Última aba da biblioteca

### ✅ Badges/Conquistas
- Sistema de desbloqueio de badges
- Verificação automática de conquistas
- Persistência de badges desbloqueados

## 📱 Próximos Recursos Possíveis

Com Supabase, você pode facilmente adicionar:

### 1. Real-time
```javascript
// Atualizar watchlist em tempo real
supabase
  .channel('watchlist-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'watchlist'
  }, payload => {
    console.log('Mudança detectada!', payload);
    renderLibrary();
  })
  .subscribe();
```

### 2. Storage de Avatares
```javascript
// Upload de avatar
const file = event.target.files[0];
await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file);
```

### 3. Compartilhamento Social
```javascript
// Listas públicas compartilháveis
CREATE TABLE public_lists (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT,
  items INTEGER[],
  is_public BOOLEAN DEFAULT false
);
```

### 4. Comentários e Avaliações
```javascript
// Sistema de reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  tmdb_id INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Recomendações Inteligentes
```javascript
// Análise de histórico para recomendar
const { data } = await supabase.rpc('get_recommendations', {
  user_id: currentUserId,
  limit: 10
});
```

## 🔧 Configurações Avançadas

### Cache Local
Para melhor performance, você pode adicionar cache:

```javascript
// Cache de perfil
let profileCache = null;
let cacheExpiry = null;

async function getCachedProfile(userId) {
  if (profileCache && Date.now() < cacheExpiry) {
    return profileCache;
  }

  const result = await supabaseGetProfile(userId);
  if (result.success) {
    profileCache = result.profile;
    cacheExpiry = Date.now() + 300000; // 5 minutos
  }
  return profileCache;
}
```

### Offline Support
```javascript
// Fila de operações offline
const offlineQueue = [];

window.addEventListener('online', async () => {
  while (offlineQueue.length > 0) {
    const operation = offlineQueue.shift();
    await operation();
  }
});
```

## 🐛 Troubleshooting

### Erro: "Invalid API key"
- Verifique se copiou a chave correta do Supabase
- Certifique-se de usar a chave **anon public**, não a **service_role**

### Erro: "Failed to fetch"
- Verifique sua conexão com internet
- Confirme se a URL do projeto está correta
- Verifique se o projeto Supabase está ativo

### Dados não aparecem
- Abra o console (F12) e veja se há erros
- Verifique se o usuário está autenticado (`console.log(currentUser)`)
- Confirme se as políticas RLS estão corretas

### Tabelas não foram criadas
- Execute o SQL novamente
- Verifique se não há erros de sintaxe
- Confirme se você tem permissões de admin no projeto

## 📞 Suporte

### Documentação Oficial
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### Comunidade
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Discussions](https://github.com/supabase/supabase/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/supabase)

## 📝 Checklist Final

Antes de considerar a migração completa:

- [ ] Projeto Supabase criado
- [ ] Tabelas criadas (5 tabelas)
- [ ] Credenciais configuradas
- [ ] SDK incluído no HTML
- [ ] Funções atualizadas no script.js
- [ ] Cadastro de usuário testado
- [ ] Login testado
- [ ] Watchlist testada
- [ ] Histórico testado
- [ ] Perfil testado
- [ ] Badges testados
- [ ] Roleta testada
- [ ] Preferências testadas
- [ ] Logout testado
- [ ] Dados aparecem no Supabase

## 🎊 Conclusão

Parabéns! Você agora tem um sistema completo de autenticação e armazenamento em nuvem!

Seus usuários podem:
- ✅ Criar conta e fazer login
- ✅ Salvar filmes favoritos
- ✅ Manter histórico
- ✅ Desbloquear conquistas
- ✅ Acessar de qualquer dispositivo

**Próximos passos sugeridos:**
1. Deploy em produção (Vercel, Netlify, etc)
2. Adicionar recursos real-time
3. Implementar sistema social
4. Criar PWA para instalação
5. Adicionar analytics

---

**Criado com ❤️ para o projeto "O Que Assistir"**

*Se tiver dúvidas, consulte os outros arquivos de documentação ou a documentação oficial do Supabase.*
