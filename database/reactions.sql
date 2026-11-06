-- Reações rápidas (🔥 😢 😂 🤯) nos títulos assistidos. Ficam na própria linha do histórico,
-- e os amigos as veem pelo get_friend_profile (database/friends.sql).
-- Pode rodar de novo sem erro.

ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS reaction TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watch_history_reaction_check') THEN
        ALTER TABLE watch_history
            ADD CONSTRAINT watch_history_reaction_check CHECK (reaction IN ('fire', 'sad', 'laugh', 'mind'));
    END IF;
END $$;

-- O histórico não tem permissão de UPDATE (só ver, inserir e apagar o próprio): esta função muda
-- apenas a reação, e só nos títulos de quem está logado. NULL tira a reação.
-- Devolve false quando o título não está no histórico da pessoa.
CREATE OR REPLACE FUNCTION set_title_reaction(p_tmdb_id INTEGER, p_reaction TEXT)
RETURNS BOOLEAN
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
    WITH updated AS (
        UPDATE watch_history SET reaction = p_reaction
        WHERE user_id = auth.uid() AND tmdb_id = p_tmdb_id
        RETURNING 1
    )
    SELECT EXISTS (SELECT 1 FROM updated);
$$;

REVOKE ALL ON FUNCTION set_title_reaction(INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_title_reaction(INTEGER, TEXT) TO authenticated;
