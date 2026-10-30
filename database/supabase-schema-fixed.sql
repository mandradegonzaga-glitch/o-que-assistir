-- ================================================
-- SCHEMA CORRIGIDO - O QUE ASSISTIR
-- ================================================
-- Correções aplicadas:
-- 1. Username mantido como UNIQUE (essencial para login)
-- 2. Política de perfis ajustada (privacidade)
-- 3. Consistência display_name/full_name
-- 4. Melhorias de segurança
-- ================================================

-- ================================================
-- 1. LIMPEZA (Opcional - Use se quiser resetar tudo)
-- ================================================
-- ATENÇÃO: Isso apaga TODOS os dados!
-- DROP TABLE IF EXISTS user_badges CASCADE;
-- DROP TABLE IF EXISTS user_preferences CASCADE;
-- DROP TABLE IF EXISTS watchlist CASCADE;
-- DROP TABLE IF EXISTS watch_history CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- ================================================
-- 2. SCHEMA DO BANCO DE DADOS
-- ================================================

-- Tabela de usuários (perfis)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL, -- MANTIDO UNIQUE - essencial para login único
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    roulette_wins INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico
CREATE TABLE IF NOT EXISTS watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'dorama')),
    release_year TEXT,
    genres INTEGER[],
    watched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id) -- Impede duplicidade do mesmo filme no histórico
);

-- Tabela de watchlist
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'dorama')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id)
);

-- Preferências
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    last_mode TEXT DEFAULT 'discover',
    last_type TEXT DEFAULT 'movie',
    last_library_tab TEXT DEFAULT 'watchlist',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    badge_name TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_name)
);

-- ================================================
-- 3. ÍNDICES DE PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON watch_history(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- ================================================
-- 4. SEGURANÇA (RLS)
-- ================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- ================================================
-- PROFILES - Políticas ajustadas para privacidade
-- ================================================

-- Ver apenas próprio perfil (dados sensíveis protegidos)
CREATE POLICY "Ver próprio perfil" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Editar próprio perfil
CREATE POLICY "Editar próprio perfil" ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Inserir próprio perfil (usado pelo trigger)
CREATE POLICY "Inserir próprio perfil" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ================================================
-- WATCH HISTORY - Apenas dados próprios
-- ================================================

CREATE POLICY "Ver próprio histórico" ON watch_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Inserir no histórico" ON watch_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deletar do histórico" ON watch_history
    FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- WATCHLIST - Apenas dados próprios
-- ================================================

CREATE POLICY "Ver própria watchlist" ON watchlist
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Inserir na watchlist" ON watchlist
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deletar da watchlist" ON watchlist
    FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- PREFERENCES - Apenas dados próprios
-- ================================================

CREATE POLICY "Ver preferências" ON user_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Editar preferências" ON user_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Criar preferências" ON user_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ================================================
-- BADGES - Apenas dados próprios
-- ================================================

CREATE POLICY "Ver badges" ON user_badges
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Inserir badges" ON user_badges
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ================================================
-- 5. AUTOMAÇÃO (Triggers)
-- ================================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de atualização
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 6. CRIAÇÃO AUTOMÁTICA DE PERFIL
-- ================================================

-- Função para criar perfil no cadastro (Auth -> Public Tables)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Cria o Perfil (CORRIGIDO: display_name consistente)
    INSERT INTO public.profiles (id, username, display_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email
    );

    -- Cria as Preferências Iniciais
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Se username duplicado, adiciona sufixo único
        INSERT INTO public.profiles (id, username, display_name, email)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)) || '_' || substring(NEW.id::text, 1, 4),
            COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
            NEW.email
        );

        INSERT INTO public.user_preferences (user_id)
        VALUES (NEW.id);

        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Liga o Trigger na tabela de autenticação do Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- 7. VIEW PÚBLICA (OPCIONAL - Para futuro sistema social)
-- ================================================

-- Se quiser permitir que usuários vejam perfis básicos de outros
-- (SEM expor email), descomente esta view:

/*
CREATE OR REPLACE VIEW public_profiles AS
SELECT
    id,
    username,
    display_name,
    avatar_url,
    created_at
FROM profiles;

-- Permitir leitura da view pública
GRANT SELECT ON public_profiles TO authenticated;
*/

-- ================================================
-- 8. FUNÇÃO UTILITÁRIA: Buscar perfil por username
-- ================================================

CREATE OR REPLACE FUNCTION get_user_by_username(search_username TEXT)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT id, profiles.username, profiles.display_name
    FROM profiles
    WHERE profiles.username = search_username
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 9. CONSTRAINTS ADICIONAIS (Validações)
-- ================================================

-- Username deve ter pelo menos 3 caracteres
ALTER TABLE profiles ADD CONSTRAINT username_length
    CHECK (length(username) >= 3);

-- Username apenas letras, números e underscore
ALTER TABLE profiles ADD CONSTRAINT username_format
    CHECK (username ~ '^[a-zA-Z0-9_]+$');

-- Email válido (básico)
ALTER TABLE profiles ADD CONSTRAINT email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL);

-- ================================================
-- 10. HISTÓRICO DE SORTEIOS
-- ================================================

CREATE TABLE IF NOT EXISTS sorteio_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'dorama')),
    sorted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_sorteio_history_user ON sorteio_history(user_id);
CREATE INDEX IF NOT EXISTS idx_sorteio_history_sorted ON sorteio_history(sorted_at DESC);

ALTER TABLE sorteio_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver próprio histórico sorteio" ON sorteio_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Inserir no histórico sorteio" ON sorteio_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deletar do histórico sorteio" ON sorteio_history
    FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- 11. BLACKLIST (Não Tenho Interesse)
-- ================================================

CREATE TABLE IF NOT EXISTS blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'dorama')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_blacklist_user ON blacklist(user_id);

ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver própria blacklist" ON blacklist
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Inserir na blacklist" ON blacklist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deletar da blacklist" ON blacklist
    FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- FIM DO SCHEMA
-- ================================================
