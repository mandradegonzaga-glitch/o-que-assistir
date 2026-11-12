-- Nota do TMDB guardada junto do título salvo (repasse do redesign, etapa 3, 2026-11-11):
-- a Biblioteca mostra a nota embaixo do pôster sem pedir de novo ao TMDB.
-- Opcional e sem valor padrão: títulos salvos antes ficam sem nota, e versões antigas do app
-- que não mandam a coluna continuam funcionando.
alter table public.watchlist       add column if not exists vote_average numeric(3,1);
alter table public.watch_history   add column if not exists vote_average numeric(3,1);
alter table public.user_list_items add column if not exists vote_average numeric(3,1);
