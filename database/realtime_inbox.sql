-- ================================================
-- AVISOS EM TEMPO REAL (pedidos de amizade, indicações e convites de Match)
-- Rodar no SQL Editor do Supabase DEPOIS de friends.sql e title_shares.sql. Pode repetir sem erro.
--
-- O Supabase só avisa o app sobre mudanças nas tabelas que estão na publicação "supabase_realtime".
-- As regras de acesso (RLS) continuam valendo: cada pessoa só recebe o que já podia ler.
-- Sem este arquivo o app funciona igual, só que confere as novidades ao voltar para a aba.
-- ================================================

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['friendships', 'match_invites', 'title_shares'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
