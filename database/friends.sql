-- ================================================
-- AMIZADES E CONVITES DE MATCH
-- Rodar uma vez no SQL Editor do Supabase. Pode repetir sem erro.
--
-- Privacidade: a busca é só por username exato, para ninguém varrer a lista de usuários,
-- e nunca por email, para não revelar quem tem conta.
-- ================================================

-- Cada pessoa decide se os amigos veem o que ela assistiu, a lista e as conquistas
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_with_friends BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (requester_id <> addressee_id)
);

-- Um único vínculo por par, em qualquer direção
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair
    ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE TABLE IF NOT EXISTS match_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    payload TEXT NOT NULL CHECK (length(payload) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS match_invites_to_user ON match_invites (to_user, created_at DESC);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_invites ENABLE ROW LEVEL SECURITY;

-- Sem acesso para quem não está logado
REVOKE ALL ON friendships, match_invites FROM anon;
REVOKE ALL ON friendships, match_invites FROM authenticated;
GRANT SELECT, INSERT, DELETE ON friendships, match_invites TO authenticated;
-- Aceitar muda só o status: quem aceita não pode trocar quem pediu
GRANT UPDATE (status) ON friendships TO authenticated;

DROP POLICY IF EXISTS "Ver as próprias amizades" ON friendships;
CREATE POLICY "Ver as próprias amizades" ON friendships
    FOR SELECT TO authenticated
    USING (auth.uid() IN (requester_id, addressee_id));

DROP POLICY IF EXISTS "Pedir amizade" ON friendships;
CREATE POLICY "Pedir amizade" ON friendships
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = requester_id AND status = 'pending');

DROP POLICY IF EXISTS "Aceitar amizade" ON friendships;
CREATE POLICY "Aceitar amizade" ON friendships
    FOR UPDATE TO authenticated
    USING (auth.uid() = addressee_id)
    WITH CHECK (auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Desfazer amizade" ON friendships;
CREATE POLICY "Desfazer amizade" ON friendships
    FOR DELETE TO authenticated
    USING (auth.uid() IN (requester_id, addressee_id));

DROP POLICY IF EXISTS "Ver os próprios convites" ON match_invites;
CREATE POLICY "Ver os próprios convites" ON match_invites
    FOR SELECT TO authenticated
    USING (auth.uid() IN (from_user, to_user));

-- Convite só entre amigos: ninguém recebe convite de desconhecidos
DROP POLICY IF EXISTS "Convidar amigos" ON match_invites;
CREATE POLICY "Convidar amigos" ON match_invites
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

DROP POLICY IF EXISTS "Apagar os próprios convites" ON match_invites;
CREATE POLICY "Apagar os próprios convites" ON match_invites
    FOR DELETE TO authenticated
    USING (auth.uid() IN (from_user, to_user));

-- Perfis são privados: as funções abaixo expõem só o mínimo, e só para quem está logado.
CREATE OR REPLACE FUNCTION find_user_by_username(p_username TEXT)
RETURNS TABLE (id UUID, username TEXT, display_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT p.id, p.username, p.display_name
    FROM profiles p
    WHERE auth.uid() IS NOT NULL
      AND lower(p.username) = lower(trim(p_username))
      AND p.id <> auth.uid()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION list_friends()
RETURNS TABLE (friendship_id UUID, other_id UUID, username TEXT, display_name TEXT, status TEXT, direction TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT f.id, p.id, p.username, p.display_name, f.status,
           CASE WHEN f.requester_id = auth.uid() THEN 'sent' ELSE 'received' END
    FROM friendships f
    JOIN profiles p ON p.id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
    WHERE auth.uid() IN (f.requester_id, f.addressee_id)
    ORDER BY f.status, p.username;
$$;

CREATE OR REPLACE FUNCTION list_match_invites()
RETURNS TABLE (id UUID, from_name TEXT, payload TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT i.id, COALESCE(p.display_name, p.username), i.payload, i.created_at
    FROM match_invites i
    JOIN profiles p ON p.id = i.from_user
    WHERE i.to_user = auth.uid()
    ORDER BY i.created_at DESC;
$$;

REVOKE ALL ON FUNCTION find_user_by_username(TEXT), list_friends(), list_match_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION find_user_by_username(TEXT), list_friends(), list_match_invites() TO authenticated;

-- Perfil de um amigo: só devolve algo se a amizade estiver aceita.
-- Sem amizade (ou pedido ainda pendente) a resposta é vazia, igual a um usuário que não existe.
-- Quem escolheu não compartilhar: o amigo recebe só o nome, sem dados para esconder na tela.
-- A reação (database/reactions.sql) vai junto no histórico; a coluna é criada aqui também,
-- para este arquivo rodar sozinho ou depois daquele
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS reaction TEXT;

CREATE OR REPLACE FUNCTION get_friend_profile(p_friend UUID)
RETURNS JSON
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT json_build_object(
        'username', p.username,
        'display_name', p.display_name,
        'private', NOT p.share_with_friends,
        'history', COALESCE((
            SELECT json_agg(h ORDER BY h.watched_at DESC) FROM (
                SELECT tmdb_id, title, poster_path, media_type, release_year, genres, reaction, watched_at
                FROM watch_history WHERE user_id = p.id AND p.share_with_friends ORDER BY watched_at DESC LIMIT 200
            ) h
        ), '[]'::json),
        'watchlist', COALESCE((
            SELECT json_agg(w ORDER BY w.added_at DESC) FROM (
                SELECT tmdb_id, title, poster_path, media_type, added_at
                FROM watchlist WHERE user_id = p.id AND p.share_with_friends ORDER BY added_at DESC LIMIT 200
            ) w
        ), '[]'::json),
        'badges', COALESCE((SELECT json_agg(badge_name) FROM user_badges WHERE user_id = p.id AND p.share_with_friends), '[]'::json)
    )
    FROM profiles p
    WHERE p.id = p_friend
      AND EXISTS (
          SELECT 1 FROM friendships f
          WHERE f.status = 'accepted'
            AND LEAST(f.requester_id, f.addressee_id) = LEAST(auth.uid(), p_friend)
            AND GREATEST(f.requester_id, f.addressee_id) = GREATEST(auth.uid(), p_friend)
      );
$$;

REVOKE ALL ON FUNCTION get_friend_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_friend_profile(UUID) TO authenticated;
