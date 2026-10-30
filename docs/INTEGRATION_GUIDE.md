# Guia de Integração das Migrações

> **Nota (2026-10-28):** `script-migrations.js` e `script.js.backup` foram movidos para `../_arquivo-legacy/` (fora do projeto) — não eram carregados pelo app. Documento mantido como histórico. Ver SEDD 008, T001-014.

Este guia explica como integrar as mudanças do Supabase no seu projeto.

## 📁 Arquivos Criados

1. **supabase-schema.sql** - Schema do banco de dados (tabelas, índices, políticas)
2. **supabase-config.js** - Configuração e funções do Supabase
3. **script-migrations.js** - Versões atualizadas das funções do script.js
4. **SUPABASE_SETUP.md** - Guia de configuração do Supabase
5. **INTEGRATION_GUIDE.md** - Este arquivo

## 🔄 Opção 1: Substituição Completa (Recomendado para novos projetos)

Se você está começando ou não tem muitos dados:

1. Faça backup do seu `script.js` atual
2. Abra o arquivo `script.js`
3. Localize e substitua as seguintes funções pelas versões em `script-migrations.js`:
   - `checkAuth()`
   - `loadUserData()`
   - `saveUserData()`
   - `registerUser()`
   - `loginUser()`
   - `loginAsGuest()`
   - `logout()`
   - `updateUserDisplay()`
   - `salvarHistorico()`
   - `removeLibItem()`
   - `toggleWatchlist()`
   - `renderLibrary()`
   - `salvarPerfil()`
   - `checkBadgeUnlock()`
   - `girarRoleta()`

4. Adicione no topo do `script.js` (após as constantes de API):
   ```javascript
   // VARIÁVEIS GLOBAIS SUPABASE
   let currentUserId = null;
   let userProfile = null;
   ```

5. Adicione no final do `script.js`:
   ```javascript
   // OBSERVADOR DE AUTENTICAÇÃO
   supabaseOnAuthStateChange(async (event, session) => {
       console.log('Auth event:', event);

       if (event === 'SIGNED_IN') {
           currentUser = session.user;
           currentUserId = session.user.id;
           await loadUserData();
       } else if (event === 'SIGNED_OUT') {
           currentUser = null;
           currentUserId = null;
           userProfile = null;
           user.history = [];
       }
   });
   ```

## 🔄 Opção 2: Integração Manual (Para projetos com customizações)

Se você já tem personalizações no código:

### Passo 1: Atualizar Variáveis Globais

Adicione após a linha `let currentUser = null;`:
```javascript
let currentUserId = null;
let userProfile = null;
```

### Passo 2: Atualizar Inicialização

Substitua:
```javascript
checkAuth();
```

Por:
```javascript
(async () => {
    await checkAuth();
})();
```

### Passo 3: Converter Funções para Async

Todas as funções que interagem com dados agora precisam ser `async`:

#### Antes:
```javascript
function checkAuth() {
    const savedUser = localStorage.getItem('current_user');
    // ...
}
```

#### Depois:
```javascript
async function checkAuth() {
    const user = await supabaseGetCurrentUser();
    // ...
}
```

### Passo 4: Substituir localStorage por Supabase

#### LocalStorage (Antes):
```javascript
localStorage.setItem('all_users', JSON.stringify(allUsers));
const users = JSON.parse(localStorage.getItem('all_users')) || {};
```

#### Supabase (Depois):
```javascript
await supabaseUpdateProfile(currentUserId, { name: user.name });
const result = await supabaseGetProfile(currentUserId);
```

## 📋 Checklist de Migração

- [ ] Configurar projeto no Supabase
- [ ] Executar script SQL (`supabase-schema.sql`)
- [ ] Obter credenciais (URL e chave)
- [ ] Configurar `supabase-config.js` com suas credenciais
- [ ] Atualizar `index.html` com SDK do Supabase (já feito)
- [ ] Atualizar variáveis globais no `script.js`
- [ ] Atualizar função `checkAuth()`
- [ ] Atualizar função `loadUserData()`
- [ ] Atualizar função `registerUser()`
- [ ] Atualizar função `loginUser()`
- [ ] Atualizar função `loginAsGuest()`
- [ ] Atualizar função `logout()`
- [ ] Atualizar função `salvarHistorico()`
- [ ] Atualizar função `toggleWatchlist()`
- [ ] Atualizar função `renderLibrary()`
- [ ] Atualizar função `removeLibItem()`
- [ ] Atualizar função `salvarPerfil()`
- [ ] Atualizar função `girarRoleta()`
- [ ] Atualizar função `checkBadgeUnlock()`
- [ ] Adicionar observador de autenticação
- [ ] Testar cadastro de usuário
- [ ] Testar login
- [ ] Testar adicionar à watchlist
- [ ] Testar marcar como assistido
- [ ] Testar salvar perfil
- [ ] Testar roleta e conquistas

## 🔍 Principais Mudanças

### 1. Autenticação

**Antes (localStorage):**
```javascript
allUsers[username] = {
    name: username,
    password: password,
    history: []
};
localStorage.setItem('all_users', JSON.stringify(allUsers));
```

**Depois (Supabase):**
```javascript
const result = await supabaseRegister(username, email, password);
if (result.success) {
    currentUser = result.user;
    currentUserId = result.user.id;
}
```

### 2. Salvar Histórico

**Antes:**
```javascript
user.history.push(entry);
localStorage.setItem('vistos_obj', JSON.stringify(vistos));
```

**Depois:**
```javascript
const result = await supabaseAddToHistory(currentUserId, entry);
if (result.success) {
    user.history.push(entry);
}
```

### 3. Watchlist

**Antes:**
```javascript
let wl = JSON.parse(localStorage.getItem('watchlist_obj')) || [];
wl.push(item);
localStorage.setItem('watchlist_obj', JSON.stringify(wl));
```

**Depois:**
```javascript
const result = await supabaseAddToWatchlist(currentUserId, item);
if (result.success) {
    showToast("⭐ Salvo!");
}
```

## ⚠️ Avisos Importantes

### 1. Senha em Hash
O Supabase armazena senhas com hash seguro automaticamente. As senhas do localStorage antigo **NÃO** podem ser migradas diretamente.

### 2. Email Temporário
O sistema agora cria emails no formato `username@oqueassistir.app` automaticamente. Usuários podem atualizar o email no perfil depois.

### 3. Login de Convidado
O login de convidado agora usa autenticação anônima do Supabase, mas os dados são salvos temporariamente.

### 4. Sincronização Automática
Com Supabase, os dados são sincronizados automaticamente entre dispositivos quando o usuário faz login.

## 🐛 Debug e Testes

### Console do Navegador

Para verificar se tudo está funcionando:

```javascript
// Ver usuário atual
console.log(currentUser, currentUserId);

// Ver perfil
console.log(userProfile);

// Testar conexão
supabaseGetCurrentUser().then(u => console.log('User:', u));
```

### Verificar no Supabase

1. Vá em **Table Editor** no painel do Supabase
2. Selecione cada tabela para ver os dados
3. Vá em **Authentication** > **Users** para ver usuários cadastrados

## 📊 Comparação: Antes vs Depois

| Aspecto | localStorage | Supabase |
|---------|-------------|----------|
| **Armazenamento** | Local (browser) | Nuvem (PostgreSQL) |
| **Sincronização** | Não | Sim, entre dispositivos |
| **Segurança** | Senha em texto plano | Senha com hash bcrypt |
| **Limite** | ~5-10MB | Ilimitado (plano free: 500MB) |
| **Multi-usuário** | Não | Sim |
| **Backup** | Manual | Automático |
| **Offline** | Funciona | Requer conexão* |
| **Performance** | Instantâneo | ~100-500ms por query |

\* É possível implementar cache local com Supabase Real-time para funcionar offline

## 🎯 Próximos Passos

Após integrar o Supabase:

1. **Real-time Features**: Adicionar notificações em tempo real
2. **Compartilhamento**: Permitir compartilhar listas entre usuários
3. **Estatísticas**: Dashboard com gráficos de visualizações
4. **Social**: Comentários e avaliações de filmes
5. **Recomendações**: Sistema de recomendação baseado em histórico
6. **PWA**: Transformar em Progressive Web App

## 📚 Recursos Adicionais

- [Documentação Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Storage para Avatars](https://supabase.com/docs/guides/storage)
- [Edge Functions](https://supabase.com/docs/guides/functions)

## 💡 Dicas

1. **Sempre use try-catch** ao chamar funções do Supabase
2. **Verifique `result.success`** antes de usar os dados
3. **Teste localmente** antes de fazer deploy
4. **Mantenha credenciais seguras** (use variáveis de ambiente em produção)
5. **Monitore uso** no painel do Supabase para não exceder limites do plano free

## ❓ Dúvidas Frequentes

### Como migrar dados existentes do localStorage?

Execute este script no console do navegador:

```javascript
// 1. Exportar dados do localStorage
const dadosAntigos = {
    usuarios: localStorage.getItem('all_users'),
    watchlist: localStorage.getItem('watchlist_obj'),
    vistos: localStorage.getItem('vistos_obj')
};
console.log(JSON.stringify(dadosAntigos, null, 2));
```

Entre em contato para ajuda com a importação para o Supabase.

### Posso usar ambos (localStorage e Supabase)?

Sim, mas não é recomendado. Pode causar conflitos de dados.

### Como funciona offline?

Por padrão, Supabase requer conexão. Para offline, implemente:
1. Cache local com IndexedDB
2. Fila de sincronização para quando voltar online
3. Supabase Realtime com persistence

### Como resetar o banco de dados?

No painel do Supabase:
1. Vá em **SQL Editor**
2. Execute: `TRUNCATE profiles, watch_history, watchlist, user_preferences, user_badges CASCADE;`
3. Ou delete o projeto e crie um novo

---

**Dúvidas?** Consulte o `SUPABASE_SETUP.md` ou a documentação oficial do Supabase.
