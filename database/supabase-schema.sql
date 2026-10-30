-- ================================================
-- SCHEMA DO BANCO DE DADOS - O QUE ASSISTIR
-- ================================================

-- Tabela de usuários (perfis)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    roulette_wins INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico (filmes/séries assistidos)
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
    UNIQUE(user_id, tmdb_id)
);

-- Tabela de watchlist (lista de desejos)
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

-- Tabela de preferências do usuário
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    last_mode TEXT DEFAULT 'discover',
    last_type TEXT DEFAULT 'movie',
    last_library_tab TEXT DEFAULT 'watchlist',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de conquistas/badges desbloqueadas
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    badge_name TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_name)
);

-- ================================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- ================================================

CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON watch_history(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_added_at ON watchlist(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Políticas para watch_history
CREATE POLICY "Usuários podem ver seu próprio histórico"
    ON watch_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir no seu histórico"
    ON watch_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar do seu histórico"
    ON watch_history FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para watchlist
CREATE POLICY "Usuários podem ver sua própria watchlist"
    ON watchlist FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir na sua watchlist"
    ON watchlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar da sua watchlist"
    ON watchlist FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para user_preferences
CREATE POLICY "Usuários podem ver suas preferências"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas preferências"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas preferências"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Políticas para user_badges
CREATE POLICY "Usuários podem ver seus badges"
    ON user_badges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir badges"
    ON user_badges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ================================================
-- TRIGGERS PARA AUTO-ATUALIZAÇÃO
-- ================================================

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_preferences
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.email
    );

    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil quando novo usuário se registra
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
