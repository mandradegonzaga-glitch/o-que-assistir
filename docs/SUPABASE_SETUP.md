# Guia de Configuração do Supabase

Este guia irá ajudá-lo a configurar o Supabase para o projeto "O Que Assistir".

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Navegador web

## 🚀 Passo 1: Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha os dados:
   - **Name**: O Que Assistir
   - **Database Password**: Crie uma senha forte (guarde bem!)
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
4. Clique em **"Create new project"**
5. Aguarde alguns minutos até o projeto ser criado

## 🗄️ Passo 2: Criar as Tabelas do Banco de Dados

1. No painel do Supabase, vá em **"SQL Editor"** (no menu lateral)
2. Clique em **"New query"**
3. Abra o arquivo `supabase-schema.sql` que foi criado
4. Copie **TODO o conteúdo** do arquivo
5. Cole no editor SQL do Supabase
6. Clique em **"Run"** (ou pressione Ctrl+Enter)
7. Você deverá ver a mensagem "Success. No rows returned"

### ✅ Verificar se as tabelas foram criadas

1. Vá em **"Table Editor"** (no menu lateral)
2. Você deve ver as seguintes tabelas:
   - `profiles`
   - `watch_history`
   - `watchlist`
   - `user_preferences`
   - `user_badges`

## 🔑 Passo 3: Obter as Credenciais

1. No painel do Supabase, vá em **"Settings"** > **"API"**
2. Localize e copie:
   - **Project URL** (ex: https://xxxxxxxxxxxx.supabase.co)
   - **anon public** (chave pública anônima - uma string longa)

## ⚙️ Passo 4: Configurar o Projeto

1. Abra o arquivo `supabase-config.js`
2. Localize as linhas:
   ```javascript
   const SUPABASE_URL = 'SUA_URL_DO_SUPABASE';
   const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANONIMA_DO_SUPABASE';
   ```
3. Substitua pelos valores que você copiou:
   ```javascript
   const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
   ```

## 📝 Passo 5: Atualizar o HTML

O arquivo `index.html` já foi atualizado para incluir:
- SDK do Supabase (via CDN)
- Script de configuração (`supabase-config.js`)
- Script principal atualizado (`script.js`)

## 🔐 Passo 6: Configurar Autenticação

1. No Supabase, vá em **"Authentication"** > **"Providers"**
2. Certifique-se de que **"Email"** está habilitado
3. Em **"Email Auth"**, configure:
   - ✅ **Enable Email provider**
   - ✅ **Confirm email** (desmarque se quiser facilitar os testes)

### Configurar Email Templates (Opcional)

Se quiser personalizar os emails:
1. Vá em **"Authentication"** > **"Email Templates"**
2. Edite os templates de:
   - Confirmação de email
   - Recuperação de senha
   - Etc.

## 🧪 Passo 7: Testar

1. Abra o projeto no navegador
2. Tente criar uma nova conta
3. Faça login
4. Adicione filmes à watchlist
5. Marque filmes como assistidos
6. Verifique no Supabase se os dados estão sendo salvos:
   - Vá em **"Table Editor"**
   - Selecione cada tabela para ver os dados

## 🔄 Migração de Dados Antigos (Opcional)

Se você tinha dados no localStorage e quer migrá-los para o Supabase:

1. Abra o console do navegador (F12)
2. Execute este código para exportar dados antigos:

```javascript
// Exportar dados do localStorage
const dadosAntigos = {
    usuarios: localStorage.getItem('all_users'),
    watchlist: localStorage.getItem('watchlist_obj'),
    vistos: localStorage.getItem('vistos_obj')
};
console.log(JSON.stringify(dadosAntigos, null, 2));
```

3. Copie o resultado
4. Entre em contato comigo se precisar de ajuda para importar

## 📊 Estrutura do Banco de Dados

### Tabela `profiles`
Armazena informações do perfil do usuário:
- `id` - ID único do usuário (UUID)
- `username` - Nome de usuário
- `display_name` - Nome de exibição
- `email` - Email
- `roulette_wins` - Vitórias na roleta

### Tabela `watch_history`
Histórico de filmes/séries assistidos:
- `user_id` - Referência ao usuário
- `tmdb_id` - ID do filme/série no TMDB
- `title` - Título
- `media_type` - Tipo (movie, tv, dorama)
- `release_year` - Ano de lançamento

### Tabela `watchlist`
Lista de filmes/séries que o usuário quer assistir:
- `user_id` - Referência ao usuário
- `tmdb_id` - ID do filme/série no TMDB
- `title` - Título
- `media_type` - Tipo (movie, tv, dorama)

### Tabela `user_preferences`
Preferências do usuário:
- `user_id` - Referência ao usuário
- `last_mode` - Último modo usado (discover/roulette)
- `last_type` - Último tipo selecionado (movie/tv/dorama)
- `last_library_tab` - Última aba da biblioteca

### Tabela `user_badges`
Conquistas desbloqueadas:
- `user_id` - Referência ao usuário
- `badge_name` - Nome do badge
- `unlocked_at` - Data de desbloqueio

## 🔒 Segurança

O projeto está configurado com **Row Level Security (RLS)**, que garante que:
- Usuários só podem ver/editar seus próprios dados
- Não é possível acessar dados de outros usuários
- As senhas são armazenadas com hash seguro pelo Supabase

## 🆘 Solução de Problemas

### Erro: "Invalid API key"
- Verifique se você copiou corretamente a chave `anon public`
- Certifique-se de que não há espaços extras

### Erro: "Failed to fetch"
- Verifique se a URL do projeto está correta
- Verifique sua conexão com a internet

### Tabelas não aparecem
- Execute o script SQL novamente
- Verifique se não houve erros na execução

### Dados não são salvos
- Verifique o console do navegador (F12) para erros
- Certifique-se de que o usuário está autenticado
- Verifique as políticas de RLS no Supabase

## 📚 Recursos Úteis

- [Documentação do Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Guia de Autenticação](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🎉 Pronto!

Seu projeto agora está usando Supabase como banco de dados! Todos os dados serão sincronizados na nuvem e os usuários poderão acessar de qualquer dispositivo.
