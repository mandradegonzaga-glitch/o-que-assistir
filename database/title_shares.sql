-- ================================================
-- INDICAÇÕES DE TÍTULOS ENTRE AMIGOS
-- Rodar no SQL Editor do Supabase DEPOIS de database/friends.sql. Pode repetir sem erro.
--
-- Guarda só o necessário para o amigo ver o card e abrir o título: o resto vem do TMDB.
-- ================================================

CREATE TABLE IF NOT EXISTS title_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv', 'dorama')),
    tmdb_id INTEGER NOT NULL CHECK (tmdb_id > 0),
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
    -- O app monta a URL da imagem com este caminho: nada além de um arquivo do TMDB
    poster_path TEXT CHECK (poster_path IS NULL OR poster_path ~ '^/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp)$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (from_user <> to_user)
);

-- Mandar o mesmo título duas vezes para a mesma pessoa não enche a caixa dela
CREATE UNIQUE INDEX IF NOT EXISTS title_shares_once
    ON title_shares (from_user, to_user, media_type, tmdb_id);
CREATE INDEX IF NOT EXISTS title_shares_to_user ON title_shares (to_user, created_at DESC);

ALTER TABLE title_shares ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON title_shares FROM anon;
REVOKE ALL ON title_shares FROM authenticated;
GRANT SELECT, INSERT, DELETE ON title_shares TO authenticated;

DROP POLICY IF EXISTS "Ver as próprias indicações" ON title_shares;
CREATE POLICY "Ver as próprias indicações" ON title_shares
    FOR SELECT TO authenticated
    USING (auth.uid() IN (from_user, to_user));

-- Indicação só entre amigos: ninguém recebe de desconhecidos
DROP POLICY IF EXISTS "Indicar para amigos" ON title_shares;
CREATE POLICY "Indicar para amigos" ON title_shares
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = from_user
        AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE f.status = 'accepted'
              AND LEAST(f.requester_id, f.addressee_id) = LEAST(from_user, to_user)
              AND GREATEST(f.requester_id, f.addressee_id) = GREATEST(from_user, to_user)
        )
    );

DROP POLICY IF EXISTS "Apagar as próprias indicações" ON title_shares;
CREATE POLICY "Apagar as próprias indicações" ON title_shares
    FOR DELETE TO authenticated
    USING (auth.uid() IN (from_user, to_user));

-- Caixa de entrada: o que os amigos indicaram, com o nome de quem mandou
CREATE OR REPLACE FUNCTION list_title_shares()
RETURNS TABLE (id UUID, from_name TEXT, media_type TEXT, tmdb_id INTEGER, title TEXT, poster_path TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT s.id, COALESCE(p.display_name, p.username), s.media_type, s.tmdb_id, s.title, s.poster_path, s.created_at
    FROM title_shares s
    JOIN profiles p ON p.id = s.from_user
    WHERE s.to_user = auth.uid()
    ORDER BY s.created_at DESC
    LIMIT 50;
$$;

REVOKE ALL ON FUNCTION list_title_shares() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION list_title_shares() TO authenticated;
