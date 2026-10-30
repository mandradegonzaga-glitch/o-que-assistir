# Changelog - series-tracking

All notable changes to this feature will be documented in this file.

## [1.0.0] - 2026-03-24

### Added — Migration 001 (planejado)

- `database/episode_progress.sql` — tabela com UNIQUE constraint, RLS, índices e view `series_in_progress`
- `src/api/tmdbSeries.js` — fetch de seasons/episodes via TMDB com cache de 1 hora
- `src/domain/seriesProgress.js` — funções puras: `getNextEpisode`, `calcProgressPercent`, `isSeriesCompleted`, `filterSeason0`, `buildEpisodeKey`
- `tests/domain/seriesProgress.test.js` — 25 testes unitários (TDD)
- Funções Supabase: `supabaseMarkEpisodeWatched`, `supabaseUnmarkEpisodeWatched`, `supabaseGetSeriesProgress`, `supabaseGetAllSeriesInProgress`
- Seção de episódios no modal — selector de temporada + lista de episódios com checkboxes
- Contador por temporada em tempo real (X/Y assistidos · N restantes)
- Aba **"Em Andamento"** na Biblioteca com cards de progresso (próximo episódio + ep. restantes)
- Badge de status no modal: "Assistindo" / "Concluído"
- Botões "✓ Temporada", "✗ Temporada", "✓ Série", "✗ Série" para marcar/desmarcar em bulk

### Added — Além do escopo planejado

- Label do botão watchlist muda para **"Quero Assistir"** em séries/doramas (em vez de "Salvar")
- `user.watchlist` carregado no startup para refletir estado correto nos botões do modal
- Toast "Adicionado a Quero Assistir!" / "Removido da lista!" com feedback correto
- **Transições automáticas de estado:**
  - Marcar 1º episódio → remove série de "Quero Assistir", aparece em "Em Andamento"
  - Marcar último episódio → move para "Já Assistidos" automaticamente
  - Desmarcar episódio de série concluída → remove de "Já Assistidos"
  - Desmarcar todos → remove de "Já Assistidos" + limpa episode_progress
- Remover série de "Já Assistidos" → limpa episode_progress (clean slate)
- `_moveFromWatchlistIfNeeded()` — helper reutilizado em toggle, marcar temporada e marcar série
- Service worker bumped para v9 a cada deploy

### Changed

- Modal de série: btn "Já Vi" substituído por indicador de status (disabled) — só vira "JÁ VISTO" automaticamente ao completar
- `switchTab` refatorado para suportar 3 abas (watchlist / andando / vistos)
- `renderLibrary` delegando aba "Em Andando" para `renderAndando()`
- `toggleWatchlist` agora awaitable e atualiza `user.watchlist` localmente
- `removeLibItem` limpa `episode_progress` ao remover série de "Já Assistidos"
- Widget "Continuar Assistindo" removido do topo da tela — movido para aba da Biblioteca

### Technical

- 114 testes passando (89 originais + 25 novos de `seriesProgress`)
- Funções puras espelhadas em `legacy/script.js` (`getNextEpisodePure`, `calcProgressPercentPure`) para evitar imports ES module no contexto legacy
- Cache de temporada TTL 1h compartilhado entre widget e modal
