# 🚀 Referência Rápida - Supabase

## 📋 Comandos SQL Úteis

### Ver todos os usuários
```sql
SELECT id, username, email, created_at
FROM profiles
ORDER BY created_at DESC;
```

### Ver histórico de um usuário
```sql
SELECT h.*, p.username
FROM watch_history h
JOIN profiles p ON h.user_id = p.id
WHERE p.username = 'nome_do_usuario'
ORDER BY h.watched_at DESC;
```

### Ver watchlist de um usuário
```sql
SELECT w.*, p.username
FROM watchlist w
JOIN profiles p ON w.user_id = p.id
WHERE p.username = 'nome_do_usuario'
ORDER BY w.added_at DESC;
```

### Estatísticas gerais
```sql
SELECT
  (SELECT COUNT(*) FROM profiles) as total_usuarios,
  (SELECT COUNT(*) FROM watch_history) as total_assistidos,
  (SELECT COUNT(*) FROM watchlist) as total_watchlist,
  (SELECT COUNT(*) FROM user_badges) as total_badges;
```

### Top usuários com mais filmes assistidos
```sql
SELECT
  p.username,
  COUNT(h.id) as total_assistidos
FROM profiles p
LEFT JOIN watch_history h ON p.id = h.user_id
GROUP BY p.username
ORDER BY total_assistidos DESC
LIMIT 10;
```

### Badges mais desbloqueados
```sql
SELECT
  badge_name,
  COUNT(*) as total_usuarios
FROM user_badges
GROUP BY badge_name
ORDER BY total_usuarios DESC;
```

### Filmes mais assistidos
```sql
SELECT
  title,
  media_type,
  COUNT(*) as vezes_assistido
FROM watch_history
GROUP BY title, media_type
ORDER BY vezes_assistido DESC
LIMIT 10;
```

## 🔧 Funções JavaScript Úteis

### Verificar se usuário está logado
```javascript
const user = await supabaseGetCurrentUser();
console.log('Usuário:', user);
```

### Obter dados completos do usuário
```javascript
const profile = await supabaseGetProfile(currentUserId);
console.log('Perfil:', profile);
```

### Listar histórico
```javascript
const { history } = await supabaseGetWatchHistory(currentUserId);
console.log('Histórico:', history);
```

### Limpar watchlist
```javascript
const { watchlist } = await supabaseGetWatchlist(currentUserId);
for (const item of watchlist) {
  await supabaseRemoveFromWatchlist(currentUserId, item.id);
}
```

### Exportar dados do usuário
```javascript
async function exportUserData(userId) {
  const profile = await supabaseGetProfile(userId);
  const history = await supabaseGetWatchHistory(userId);
  const watchlist = await supabaseGetWatchlist(userId);
  const badges = await supabaseGetBadges(userId);

  return {
    profile: profile.profile,
    history: history.history,
    watchlist: watchlist.watchlist,
    badges: badges.badges
  };
}

// Usar
const data = await exportUserData(currentUserId);
console.log(JSON.stringify(data, null, 2));
```

## 🗄️ Manutenção do Banco

### Limpar dados de teste
```sql
-- CUIDADO: Isso apaga TODOS os dados
TRUNCATE profiles, watch_history, watchlist, user_preferences, user_badges CASCADE;
```

### Limpar apenas histórico e watchlist
```sql
TRUNCATE watch_history, watchlist;
```

### Deletar usuário específico
```sql
DELETE FROM profiles WHERE username = 'nome_do_usuario';
-- Isso automaticamente deleta todos os dados relacionados (CASCADE)
```

### Resetar contador de vitórias da roleta
```sql
UPDATE profiles SET roulette_wins = 0;
```

### Resetar badges de um usuário
```sql
DELETE FROM user_badges WHERE user_id = 'uuid_do_usuario';
```

## 📊 Queries de Análise

### Filmes vs Séries
```sql
SELECT
  media_type,
  COUNT(*) as total
FROM watch_history
GROUP BY media_type;
```

### Gêneros mais assistidos
```sql
SELECT
  unnest(genres) as genre_id,
  COUNT(*) as total
FROM watch_history
GROUP BY genre_id
ORDER BY total DESC
LIMIT 10;
```

### Usuários mais ativos (últimos 7 dias)
```sql
SELECT
  p.username,
  COUNT(h.id) as filmes_assistidos
FROM profiles p
JOIN watch_history h ON p.id = h.user_id
WHERE h.watched_at > NOW() - INTERVAL '7 days'
GROUP BY p.username
ORDER BY filmes_assistidos DESC
LIMIT 10;
```

### Taxa de conversão (watchlist → assistido)
```sql
SELECT
  p.username,
  COUNT(DISTINCT w.tmdb_id) as na_watchlist,
  COUNT(DISTINCT h.tmdb_id) as assistidos,
  ROUND(
    (COUNT(DISTINCT h.tmdb_id)::DECIMAL /
     NULLIF(COUNT(DISTINCT w.tmdb_id), 0) * 100),
    2
  ) as taxa_conversao
FROM profiles p
LEFT JOIN watchlist w ON p.id = w.user_id
LEFT JOIN watch_history h ON p.id = h.user_id
GROUP BY p.username;
```

## 🔐 Segurança

### Ver políticas RLS
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public';
```

### Verificar permissões de uma tabela
```sql
SELECT * FROM pg_policies WHERE tablename = 'watch_history';
```

### Recriar política RLS
```sql
-- Dropar política antiga
DROP POLICY IF EXISTS "policy_name" ON table_name;

-- Criar nova
CREATE POLICY "policy_name"
  ON table_name
  FOR SELECT
  USING (auth.uid() = user_id);
```

## 🛠️ Debug no Console

### Ver estado atual
```javascript
console.log({
  currentUser,
  currentUserId,
  userProfile,
  history: user.history,
  rouletteWins: user.rouletteWins
});
```

### Testar conexão
```javascript
supabase
  .from('profiles')
  .select('count')
  .then(({ data, error }) => {
    if (error) console.error('Erro:', error);
    else console.log('Conectado! Total de perfis:', data);
  });
```

### Ouvir mudanças em tempo real
```javascript
const subscription = supabase
  .channel('db-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'watch_history'
  }, payload => {
    console.log('Mudança detectada:', payload);
  })
  .subscribe();

// Parar de ouvir
// subscription.unsubscribe();
```

## 📈 Performance

### Ver tamanho das tabelas
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Ver queries mais lentas
```sql
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE query LIKE '%watch_history%'
ORDER BY mean_time DESC
LIMIT 10;
```

### Criar índice customizado
```sql
CREATE INDEX idx_custom_name ON table_name(column_name);
```

## 🔄 Backup e Restore

### Exportar dados (via Supabase CLI)
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Exportar
supabase db dump -f backup.sql
```

### Restaurar dados
```bash
supabase db push -f backup.sql
```

## 🌐 API REST

### Buscar histórico via API REST
```javascript
fetch('https://seu-projeto.supabase.co/rest/v1/watch_history?user_id=eq.UUID', {
  headers: {
    'apikey': 'SUA_ANON_KEY',
    'Authorization': 'Bearer TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

### Adicionar via API REST
```javascript
fetch('https://seu-projeto.supabase.co/rest/v1/watch_history', {
  method: 'POST',
  headers: {
    'apikey': 'SUA_ANON_KEY',
    'Authorization': 'Bearer TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 'UUID',
    tmdb_id: 123,
    title: 'Filme Teste'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

## 📱 Atalhos do Teclado

No painel do Supabase:

- `Ctrl/Cmd + K` - Busca rápida
- `Ctrl/Cmd + Enter` - Executar query SQL
- `Ctrl/Cmd + S` - Salvar query

## 🎯 Snippets Úteis

### Verificar e criar perfil se não existir
```javascript
async function ensureProfile(userId) {
  let { data, error } = await supabase
    .from('profiles')
    .select()
    .eq('id', userId)
    .single();

  if (error || !data) {
    // Criar perfil
    await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: 'user_' + userId.substring(0, 8)
      });
  }
}
```

### Busca com filtros múltiplos
```javascript
const { data } = await supabase
  .from('watch_history')
  .select('*')
  .eq('user_id', userId)
  .in('media_type', ['movie', 'tv'])
  .gte('release_year', '2020')
  .order('watched_at', { ascending: false })
  .limit(10);
```

### Paginação
```javascript
const pageSize = 20;
const page = 1;
const { data } = await supabase
  .from('watch_history')
  .select('*')
  .range((page - 1) * pageSize, page * pageSize - 1);
```

---

**💡 Dica:** Salve este arquivo como favorito para consultas rápidas!
