# 🔧 Debug - Problema de Autenticação

## ⚠️ Problema Comum: Email Provider Desabilitado

O Supabase precisa ter o **Email Provider** habilitado para permitir cadastro.

### ✅ Solução Rápida

1. Acesse: https://supabase.com/dashboard/project/wzelzstndxtqnboravze/auth/providers
2. Procure por **"Email"**
3. Certifique-se que está **HABILITADO** (toggle verde)
4. Role até encontrar estas opções:

```
✅ Enable Email provider
✅ Confirm email (DESMARQUE isso para facilitar testes)
```

5. Se mudou algo, clique em **"Save"**
6. Tente criar conta novamente

---

## 🔍 Verificar Erros no Console

### Como Abrir o Console

1. Pressione **F12** no navegador
2. Clique na aba **"Console"**
3. Tente criar conta novamente
4. Copie os erros em vermelho e me envie

### Erros Comuns

#### Erro: "Email signups are disabled"
**Causa:** Email provider desabilitado

**Solução:** Siga os passos acima (habilitar Email provider)

#### Erro: "Invalid API key"
**Causa:** Credenciais incorretas

**Solução:**
1. Vá em: https://supabase.com/dashboard/project/wzelzstndxtqnboravze/settings/api
2. Verifique se a chave em `supabase-config.js` é a mesma que "anon public"

#### Erro: "User already registered"
**Causa:** Username já existe

**Solução:** Tente outro username

#### Erro: "Cannot read property 'createClient'"
**Causa:** SDK não carregou

**Solução:**
1. Verifique sua internet
2. Recarregue a página (F5)
3. Limpe o cache (Ctrl+Shift+Delete)

---

## 🧪 Teste de Conexão

Abra o Console (F12) e cole este código:

```javascript
// Teste 1: Verificar se SDK carregou
console.log('Supabase SDK:', window.supabase ? '✅ Carregado' : '❌ Não carregado');

// Teste 2: Verificar cliente
console.log('Cliente Supabase:', supabase ? '✅ Inicializado' : '❌ Não inicializado');

// Teste 3: Testar conexão
supabase.from('profiles').select('count')
  .then(r => console.log('✅ Conexão OK:', r))
  .catch(e => console.error('❌ Erro de conexão:', e));

// Teste 4: Verificar configurações de auth
supabase.auth.getSession()
  .then(r => console.log('Session:', r))
  .catch(e => console.error('Auth error:', e));
```

---

## 🔄 Solução Alternativa: Desabilitar Confirmação de Email

Se o problema persistir, desabilite a confirmação de email:

1. Vá em: https://supabase.com/dashboard/project/wzelzstndxtqnboravze/auth/providers
2. Clique em **Email**
3. **DESMARQUE** "Confirm email"
4. Clique em **Save**

Isso permite que usuários se cadastrem sem precisar confirmar email.

---

## 🛠️ Verificar Políticas de Autenticação

1. Vá em: https://supabase.com/dashboard/project/wzelzstndxtqnboravze/auth/policies
2. Certifique-se que há políticas para:
   - ✅ profiles (SELECT, INSERT, UPDATE)
   - ✅ user_preferences (SELECT, INSERT)

---

## 📞 Ainda não funciona?

Me envie:
1. **Erros do console** (F12)
2. **Print da tela de erro** (se houver)
3. **Configuração de Email Provider** (print da página de providers)

Vou identificar o problema exato e corrigir!
