-- ================================================
-- LISTAS PERSONALIZADAS ("Maratona Halloween", "Filmes com a namorada"...)
-- Rodar no SQL Editor do Supabase. Pode repetir sem erro.
--
-- Cada lista é só da pessoa que a criou. Um título pode estar em várias listas,
-- sem mexer em "Quero Assistir" nem em "Já assistidos".
-- ================================================

CREATE TABLE IF NOT EXISTS user_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
    emoji TEXT NOT NULL DEFAULT '🎬' CHECK (length(emoji) BETWEEN 1 AND 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Duas listas com o mesmo nome (sem diferenciar maiúsculas) confundem: uma só por pessoa
CREATE UNIQUE INDEX IF NOT EXISTS user_lists_name_once ON user_lists (user_id, lower(btrim(name)));

CREATE TABLE IF NOT EXISTS user_list_items (
    list_id UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL CHECK (tmdb_id > 0),
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'dorama')),
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
    -- O app monta a URL da imagem com este caminho: nada além de um arquivo do TMDB
    poster_path TEXT CHECK (poster_path IS NULL OR poster_path ~ '^/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp)$'),
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (list_id, tmdb_id)
);

CREATE INDEX IF NOT EXISTS user_list_items_user ON user_list_items (user_id, added_at);

-- Limites contra abuso: 50 listas por pessoa e 500 títulos por lista
CREATE OR REPLACE FUNCTION user_lists_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF TG_TABLE_NAME = 'user_lists' THEN
        IF (SELECT count(*) FROM user_lists WHERE user_id = NEW.user_id) >= 50 THEN
            RAISE EXCEPTION 'limite de 50 listas' USING ERRCODE = 'check_violation';
        END IF;
    ELSIF (SELECT count(*) FROM user_list_items WHERE list_id = NEW.list_id) >= 500 THEN
        RAISE EXCEPTION 'limite de 500 títulos por lista' USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

-- Só o gatilho usa a função: ninguém a chama pela API
REVOKE EXECUTE ON FUNCTION user_lists_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_lists_limit ON user_lists;
CREATE TRIGGER user_lists_limit BEFORE INSERT ON user_lists
    FOR EACH ROW EXECUTE FUNCTION user_lists_limit();
DROP TRIGGER IF EXISTS user_list_items_limit ON user_list_items;
CREATE TRIGGER user_list_items_limit BEFORE INSERT ON user_list_items
    FOR EACH ROW EXECUTE FUNCTION user_lists_limit();

ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_list_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON user_lists, user_list_items FROM anon;
REVOKE ALL ON user_lists, user_list_items FROM authenticated;
GRANT SELECT, INSERT, DELETE ON user_lists, user_list_items TO authenticated;
-- Renomear e trocar o emoji; o dono e a data não mudam
GRANT UPDATE (name, emoji) ON user_lists TO authenticated;

DROP POLICY IF EXISTS "Ver as próprias listas" ON user_lists;
CREATE POLICY "Ver as próprias listas" ON user_lists
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Criar as próprias listas" ON user_lists;
CREATE POLICY "Criar as próprias listas" ON user_lists
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Mudar as próprias listas" ON user_lists;
CREATE POLICY "Mudar as próprias listas" ON user_lists
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Apagar as próprias listas" ON user_lists;
CREATE POLICY "Apagar as próprias listas" ON user_lists
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Ver os títulos das próprias listas" ON user_list_items;
CREATE POLICY "Ver os títulos das próprias listas" ON user_list_items
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Só entra em lista da própria pessoa
DROP POLICY IF EXISTS "Pôr títulos nas próprias listas" ON user_list_items;
CREATE POLICY "Pôr títulos nas próprias listas" ON user_list_items
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (SELECT 1 FROM user_lists l WHERE l.id = list_id AND l.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Tirar títulos das próprias listas" ON user_list_items;
CREATE POLICY "Tirar títulos das próprias listas" ON user_list_items
    FOR DELETE TO authenticated USING (auth.uid() = user_id);
