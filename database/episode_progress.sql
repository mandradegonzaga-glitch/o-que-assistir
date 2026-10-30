-- ================================================
-- MIGRATION: episode_progress
-- Feature: 004-series-tracking / Migration 001
-- Data: 2026-03-24
-- ================================================
-- Rastreia episódios individuais assistidos por usuário.
-- Separado de watch_history (que registra série/filme como unidade).
-- ================================================

CREATE TABLE IF NOT EXISTS episode_progress (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    series_id        INTEGER     NOT NULL,
    series_title     TEXT        NOT NULL,
    series_poster    TEXT,
    media_type       TEXT        NOT NULL CHECK (media_type IN ('tv', 'dorama')),
    season_number    INTEGER     NOT NULL,
    episode_number   INTEGER     NOT NULL,
    watched_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, series_id, season_number, episode_number)
);

-- ================================================
-- ÍNDICES
-- ================================================

-- Buscar todo o progresso do usuário numa série
CREATE INDEX IF NOT EXISTS idx_episode_progress_user_series
    ON episode_progress(user_id, series_id);

-- Buscar todas as séries em andamento do usuário (widget Up Next)
CREATE INDEX IF NOT EXISTS idx_episode_progress_user
    ON episode_progress(user_id);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

ALTER TABLE episode_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio progresso de episódios"
    ON episode_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem registrar progresso de episódios"
    ON episode_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover progresso de episódios"
    ON episode_progress FOR DELETE
    USING (auth.uid() = user_id);

-- ================================================
-- VIEW: series_in_progress
-- Retorna séries com pelo menos 1 episódio assistido,
-- com metadados e contagem de episódios assistidos.
-- ================================================

CREATE OR REPLACE VIEW series_in_progress AS
SELECT
    user_id,
    series_id,
    MAX(series_title)   AS series_title,
    MAX(series_poster)  AS series_poster,
    MAX(media_type)     AS media_type,
    COUNT(*)            AS episodes_watched,
    MAX(watched_at)     AS last_watched_at
FROM episode_progress
GROUP BY user_id, series_id;
