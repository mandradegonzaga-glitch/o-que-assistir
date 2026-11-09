// Cliente Supabase e todas as chamadas ao banco
import { MAX_SORTEIO_HISTORY, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/constants.js';
import { getTitle } from '../domain/mediaItem.js';
import { buildEpisodeKey } from '../domain/seriesProgress.js';
import { storage } from '../utils/storage.js';

// Aviso de erro fatal na própria página (ainda não há interface pronta nesse ponto)
function showFatalError(message) {
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.className = 'fatal-error';
    box.textContent = message;
    document.body.prepend(box);
}

if (typeof window.supabase === 'undefined') {
    showFatalError('Não foi possível carregar o app.\nVerifique a conexão com a internet e se algum bloqueador (AdBlock/firewall) está impedindo o carregamento, depois recarregue a página.');
    throw new Error('Supabase SDK não carregou');
}

// Onde o SDK guarda a sessão no navegador
const AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

export let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    showFatalError('Não foi possível conectar ao servidor. Recarregue a página; se continuar, tente mais tarde.');
    throw error;
}

// Códigos de erro do Postgres/PostgREST que mudam o resultado
const PG = {
    UNIQUE: '23505',           // linha repetida
    UNDEFINED_TABLE: '42P01',  // SQL opcional ainda não rodado
    NO_TABLE: 'PGRST205',      // idem, visto pelo PostgREST
    NO_FUNCTION: 'PGRST202',   // função (rpc) de um SQL opcional ainda não rodado
};

const TABLE = {
    PROFILES: 'profiles',
    HISTORY: 'watch_history',
    WATCHLIST: 'watchlist',
    LISTS: 'user_lists',
    LIST_ITEMS: 'user_list_items',
    PREFERENCES: 'user_preferences',
    BADGES: 'user_badges',
    SORTEIO: 'sorteio_history',
    BLACKLIST: 'blacklist',
    EPISODES: 'episode_progress',
    FRIENDSHIPS: 'friendships',
    MATCH_INVITES: 'match_invites',
    TITLE_SHARES: 'title_shares',
};

// Chaves únicas usadas no upsert
const ON_CONFLICT = {
    TITLE: 'user_id,tmdb_id',
    LIST_ITEM: 'list_id,tmdb_id',
    EPISODE: 'user_id,series_id,season_number,episode_number',
};

// SQL opcional (amigos, reações...) ainda não rodado no projeto: a tela que depende dele fica oculta
const isMissingSql = error => [PG.UNDEFINED_TABLE, PG.NO_TABLE, PG.NO_FUNCTION].includes(error?.code);

/**
 * Roda um pedido ao Supabase e devolve sempre { success, ... } em vez de lançar erro.
 * - label: o que estava fazendo, para o console ("Erro ao <label>")
 * - request: função que devolve { data, error } (a query é montada dentro dela, então erro ao montar também vira falha)
 * - onData: campos extras do sucesso, a partir de data
 * - fallback: campos extras da falha (objeto, ou função que recebe o erro)
 * Toda falha vai para o console, menos as esperadas: SQL opcional faltando e pedido repetido ({ duplicate }).
 */
async function run(label, request, onData = () => ({}), fallback = {}) {
    try {
        const { data, error } = await request();
        if (error) throw error;
        return { success: true, ...onData(data) };
    } catch (error) {
        const extra = typeof fallback === 'function' ? fallback(error) : fallback;
        if (!isMissingSql(error) && !extra.duplicate) console.error(`Erro ao ${label}:`, error);
        return { success: false, error: error.message, code: error.code, ...extra };
    }
}

// Linha que já existia conta como sucesso; o data vira ALREADY para quem precisa diferenciar
const ALREADY = Symbol('já existia');
const allowDuplicate = request => async () => {
    const response = await request();
    return response.error?.code === PG.UNIQUE ? { data: ALREADY, error: null } : response;
};

// Inserção idempotente que devolve a linha criada, ou `message` se ela já existia
const insertOnce = (label, request, message) =>
    run(label, allowDuplicate(request), data => (data === ALREADY ? { message } : { data }));

// Título do app ({ id, title, poster, type }) como colunas do banco
const titleRow = item => ({ tmdb_id: item.id, title: item.title, poster_path: item.poster, media_type: item.type });

// Título cru do TMDB (sorteio e blacklist guardam o item como veio da API)
const tmdbTitleRow = item => ({ tmdb_id: item.id, title: getTitle(item), poster_path: item.poster_path, media_type: item.media_type || 'movie' });

const listItemRow = (userId, listId, item) => ({ list_id: listId, user_id: userId, ...titleRow(item) });

const episodeRow = (userId, series, seasonNumber, episodeNumber) => ({
    user_id: userId,
    series_id: series.id,
    series_title: series.title,
    series_poster: series.poster || null,
    media_type: series.type || 'tv',
    season_number: seasonNumber,
    episode_number: episodeNumber,
});

// ================================================
// AUTENTICAÇÃO
// ================================================

export function supabaseRegister(username, email, password) {
    return run('registrar',
        () => supabase.auth.signUp({ email, password, options: { data: { username, display_name: username } } }),
        data => ({ user: data.user }));
}

export function supabaseLogin(email, password) {
    return run('fazer login', () => supabase.auth.signInWithPassword({ email, password }), data => ({ user: data.user }));
}

export function supabaseLogout() {
    return run('fazer logout', () => supabase.auth.signOut());
}

// Devolve o usuário (ou null), não o formato { success }
export async function supabaseGetCurrentUser() {
    const { user = null } = await run('obter usuário', () => supabase.auth.getUser(), data => ({ user: data.user }));
    return user;
}

export function supabaseOnAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

export function supabaseChangePassword(newPassword) {
    return run('alterar senha', () => supabase.auth.updateUser({ password: newPassword }), data => ({ data }));
}

export function supabaseResetPassword(email) {
    return run('enviar email de recuperação',
        () => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }),
        data => ({ data }));
}

// Dados nos metadados da conta: sincroniza entre aparelhos sem tabela nova
export function supabaseUpdateUserData(data) {
    return run('salvar dados da conta', () => supabase.auth.updateUser({ data }));
}

// Apaga login e todos os dados pela Edge Function delete-account; só informa sucesso depois de o servidor confirmar
export function supabaseDeleteAccount() {
    return run('deletar conta', async () => {
        const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
        if (error) return { error };
        if (!data?.deleted) throw new Error('Resposta inesperada do servidor');

        // O usuário não existe mais, então o signOut responde 403 e mantém a sessão salva: limpa à mão
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) storage.remove(AUTH_STORAGE_KEY);
        return {};
    });
}

// ================================================
// PERFIL
// ================================================

export function supabaseGetProfile(userId) {
    return run('obter perfil',
        () => supabase.from(TABLE.PROFILES).select('*').eq('id', userId).single(),
        data => ({ profile: data }));
}

export function supabaseUpdateProfile(userId, updates) {
    return run('atualizar perfil',
        () => supabase.from(TABLE.PROFILES).update(updates).eq('id', userId).select().single(),
        data => ({ profile: data }));
}

// Lê e grava em seguida (não é atômico; duas vitórias simultâneas contariam uma)
export function supabaseIncrementRouletteWins(userId) {
    return run('incrementar vitórias', async () => {
        const read = await supabase.from(TABLE.PROFILES).select('roulette_wins').eq('id', userId).single();
        if (read.error) return read;
        return supabase.from(TABLE.PROFILES)
            .update({ roulette_wins: (read.data?.roulette_wins || 0) + 1 })
            .eq('id', userId).select().single();
    }, data => ({ wins: data.roulette_wins }));
}

// ================================================
// HISTÓRICO (ASSISTIDOS)
// ================================================

export function supabaseGetWatchHistory(userId) {
    return run('obter histórico',
        () => supabase.from(TABLE.HISTORY).select('*').eq('user_id', userId).order('watched_at', { ascending: false }),
        data => ({
            history: data.map(item => ({
                id: item.tmdb_id,
                title: item.title,
                poster: item.poster_path,
                type: item.media_type,
                year: item.release_year,
                genres: item.genres,
                reaction: item.reaction || null,
                watchedAt: item.watched_at,
            })),
        }),
        { history: [] });
}

export function supabaseAddToHistory(userId, item) {
    return insertOnce('adicionar ao histórico',
        () => supabase.from(TABLE.HISTORY)
            .insert({ user_id: userId, ...titleRow(item), release_year: item.year, genres: item.genres })
            .select().single(),
        'Item já existe no histórico');
}

// Reação rápida (database/reactions.sql). null tira. Sem o SQL, ou título fora do histórico: success false.
export function supabaseSetReaction(tmdbId, reaction) {
    return run('gravar a reação', () => supabase.rpc('set_title_reaction', { p_tmdb_id: tmdbId, p_reaction: reaction }), data => {
        if (data !== true) throw new Error('reação não gravada');
        return {};
    });
}

export function supabaseRemoveFromHistory(userId, tmdbId) {
    return run('remover do histórico', () => supabase.from(TABLE.HISTORY).delete().eq('user_id', userId).eq('tmdb_id', tmdbId));
}

// ================================================
// WATCHLIST
// ================================================

export function supabaseGetWatchlist(userId) {
    return run('obter watchlist',
        () => supabase.from(TABLE.WATCHLIST).select('*').eq('user_id', userId).order('added_at', { ascending: false }),
        data => ({ watchlist: data.map(item => ({ id: item.tmdb_id, title: item.title, poster: item.poster_path, type: item.media_type })) }),
        { watchlist: [] });
}

export function supabaseAddToWatchlist(userId, item) {
    return insertOnce('adicionar à watchlist',
        () => supabase.from(TABLE.WATCHLIST).insert({ user_id: userId, ...titleRow(item) }).select().single(),
        'Item já existe na watchlist');
}

export function supabaseRemoveFromWatchlist(userId, tmdbId) {
    return run('remover da watchlist', () => supabase.from(TABLE.WATCHLIST).delete().eq('user_id', userId).eq('tmdb_id', tmdbId));
}

/**
 * Importar dados do convidado / versão antiga. Upsert ignora o que já existe, então repetir não duplica.
 * A data real não existe nos dados antigos: meio-dia evita desbloquear "Madrugador" por acidente.
 */
export function supabaseImportLegacyData(userId, { history, watchlist, series = [], lists = [] }) {
    return run('importar dados antigos', async () => {
        const noon = new Date();
        noon.setHours(12, 0, 0, 0);
        const keep = { onConflict: ON_CONFLICT.TITLE, ignoreDuplicates: true };

        if (watchlist.length > 0) {
            const { error } = await supabase.from(TABLE.WATCHLIST).upsert(
                watchlist.map(i => ({ user_id: userId, ...titleRow(i) })), keep);
            if (error) return { error };
        }

        if (history.length > 0) {
            const { error } = await supabase.from(TABLE.HISTORY).upsert(
                history.map(i => ({ user_id: userId, ...titleRow(i), release_year: i.year, genres: i.genres, watched_at: noon.toISOString() })), keep);
            if (error) return { error };
        }

        // Episódios marcados como convidado; os que a conta já tinha ficam como estão
        const episodes = series.flatMap(s => s.episodes.map(ep => episodeRow(userId, s, ep.season_number, ep.episode_number)));
        if (episodes.length > 0) {
            const { error } = await supabase.from(TABLE.EPISODES).upsert(episodes, { onConflict: ON_CONFLICT.EPISODE, ignoreDuplicates: true });
            if (error) return { error };
        }

        await importLists(userId, lists);
        return {};
    });
}

// ================================================
// LISTAS PERSONALIZADAS (database/user_lists.sql)
// ================================================

/** Listas e títulos de uma vez; `missing` quando o SQL ainda não foi rodado no projeto */
export function supabaseGetLists(userId) {
    return run('obter listas', async () => {
        const [lists, items] = await Promise.all([
            supabase.from(TABLE.LISTS).select('id, name, emoji, share_token').eq('user_id', userId).order('created_at', { ascending: true }),
            supabase.from(TABLE.LIST_ITEMS).select('list_id, tmdb_id, title, poster_path, media_type, position').eq('user_id', userId).order('added_at', { ascending: true }),
        ]);
        return { data: { lists: lists.data, items: items.data }, error: lists.error || items.error };
    }, data => data, error => ({
        missing: isMissingSql(error), lists: [], items: [],
    }));
}

const duplicateName = error => ({ duplicate: error.code === PG.UNIQUE });

/** Cria a lista e devolve o id; `duplicate` quando já existe uma com o mesmo nome */
export function supabaseCreateList(userId, { name, emoji }) {
    return run('criar lista',
        () => supabase.from(TABLE.LISTS).insert({ user_id: userId, name, emoji }).select('id').single(),
        data => ({ id: data.id }), duplicateName);
}

export function supabaseUpdateList(listId, { name, emoji }) {
    return run('renomear lista', () => supabase.from(TABLE.LISTS).update({ name, emoji }).eq('id', listId), undefined, duplicateName);
}

/** Os títulos da lista saem junto (ON DELETE CASCADE) */
export function supabaseDeleteList(listId) {
    return run('apagar lista', () => supabase.from(TABLE.LISTS).delete().eq('id', listId));
}

export function supabaseAddListItem(userId, listId, item) {
    return run('pôr na lista', allowDuplicate(() => supabase.from(TABLE.LIST_ITEMS).insert(listItemRow(userId, listId, item))));
}

/** Vários títulos de uma vez (coleção copiada, importação); os que já estavam na lista ficam como estão */
export async function supabaseAddListItems(userId, listId, items) {
    if (items.length === 0) return { success: true };
    return run('pôr títulos na lista', () => supabase.from(TABLE.LIST_ITEMS).upsert(
        items.map(item => listItemRow(userId, listId, item)),
        { onConflict: ON_CONFLICT.LIST_ITEM, ignoreDuplicates: true }
    ));
}

/** Grava a ordem inteira da lista (ids na ordem nova) */
export function supabaseReorderList(listId, tmdbIds) {
    return run('ordenar lista', () => supabase.rpc('reorder_list_items', { p_list_id: listId, p_tmdb_ids: tmdbIds }));
}

/** Liga (devolve o token do link) ou desliga o link público da lista */
export function supabaseSetListSharing(listId, on) {
    return run('mudar o compartilhamento da lista', () => supabase.rpc('set_list_sharing', { p_list_id: listId, p_on: on }), data => {
        if (on && !data) throw new Error('lista não encontrada');
        return { token: data || null };
    });
}

/** Lista aberta pelo link público; funciona sem login */
export function supabaseGetSharedList(token) {
    return run('abrir lista compartilhada', () => supabase.rpc('get_shared_list', { p_token: token }), data => ({ list: data }));
}

export function supabaseRemoveListItem(listId, tmdbId) {
    return run('tirar da lista', () => supabase.from(TABLE.LIST_ITEMS).delete().eq('list_id', listId).eq('tmdb_id', tmdbId));
}

// Listas do convidado indo para a conta: uma com o mesmo nome recebe os títulos, em vez de virar repetida
async function importLists(userId, lists) {
    if (lists.length === 0) return;
    const current = await supabaseGetLists(userId);
    if (!current.success) throw new Error('listas indisponíveis');
    const byName = new Map(current.lists.map(l => [l.name.trim().toLocaleLowerCase('pt-BR'), l.id]));
    for (const list of lists) {
        let listId = byName.get(list.name.toLocaleLowerCase('pt-BR'));
        if (!listId) {
            const created = await supabaseCreateList(userId, list);
            if (!created.success) throw new Error('não criou a lista');
            listId = created.id;
        }
        const added = await supabaseAddListItems(userId, listId, list.items);
        if (!added.success) throw new Error('não pôs os títulos');
    }
}

// ================================================
// PREFERÊNCIAS
// ================================================

export function supabaseGetPreferences(userId) {
    return run('obter preferências',
        () => supabase.from(TABLE.PREFERENCES).select('*').eq('user_id', userId).single(),
        data => ({ preferences: data }));
}

export function supabaseUpdatePreferences(userId, preferences) {
    return run('atualizar preferências',
        () => supabase.from(TABLE.PREFERENCES).upsert({ user_id: userId, ...preferences }).select().single(),
        data => ({ preferences: data }));
}

// ================================================
// BADGES
// ================================================

export function supabaseUnlockBadge(userId, badgeName) {
    return insertOnce('desbloquear badge',
        () => supabase.from(TABLE.BADGES).insert({ user_id: userId, badge_name: badgeName }).select().single(),
        'Badge já desbloqueado');
}

// Nomes das conquistas já ganhas pela conta
export function supabaseGetBadges(userId) {
    return run('obter badges',
        () => supabase.from(TABLE.BADGES).select('badge_name').eq('user_id', userId),
        data => ({ names: (data || []).map(row => row.badge_name) }));
}

// ================================================
// AMIZADES E CONVITES (database/friends.sql)
// Sem as tabelas no banco a falha é esperada (run não loga), e a tela de amigos fica oculta
// ================================================

const duplicateRequest = error => (error.code === PG.UNIQUE ? { duplicate: true } : {});

export function supabaseFindUser(username) {
    return run('buscar usuário', () => supabase.rpc('find_user_by_username', { p_username: username }), data => ({ user: data?.[0] || null }));
}

export function supabaseListFriends() {
    return run('listar amigos', () => supabase.rpc('list_friends'), data => ({ friends: data || [] }), { friends: [] });
}

export function supabaseGetFriendProfile(friendId) {
    return run('abrir o perfil do amigo', () => supabase.rpc('get_friend_profile', { p_friend: friendId }), data => ({ profile: data }));
}

export function supabaseRequestFriend(userId, friendId) {
    return run('pedir amizade', () => supabase.from(TABLE.FRIENDSHIPS).insert({ requester_id: userId, addressee_id: friendId }), undefined, duplicateRequest);
}

export function supabaseAcceptFriend(friendshipId) {
    return run('aceitar amizade', () => supabase.from(TABLE.FRIENDSHIPS).update({ status: 'accepted' }).eq('id', friendshipId));
}

export function supabaseRemoveFriend(friendshipId) {
    return run('desfazer amizade', () => supabase.from(TABLE.FRIENDSHIPS).delete().eq('id', friendshipId));
}

export function supabaseSendMatchInvite(userId, friendId, payload) {
    return run('enviar convite de Match', () => supabase.from(TABLE.MATCH_INVITES).insert({ from_user: userId, to_user: friendId, payload }));
}

export function supabaseListMatchInvites() {
    return run('listar convites de Match', () => supabase.rpc('list_match_invites'), data => ({ invites: data || [] }), { invites: [] });
}

export function supabaseDeleteMatchInvite(inviteId) {
    return run('apagar convite de Match', () => supabase.from(TABLE.MATCH_INVITES).delete().eq('id', inviteId));
}

// Avisos: o Supabase manda um sinal quando chega algo para esta pessoa (database/realtime_inbox.sql).
// O sinal só diz "mudou"; os dados vêm das mesmas funções de sempre, que respeitam as regras de acesso.
export function subscribeInbox(userId, onChange) {
    const channel = supabase.channel(`caixa:${userId}`);
    [
        ['INSERT', TABLE.TITLE_SHARES, `to_user=eq.${userId}`],
        ['INSERT', TABLE.MATCH_INVITES, `to_user=eq.${userId}`],
        ['INSERT', TABLE.FRIENDSHIPS, `addressee_id=eq.${userId}`],
        ['UPDATE', TABLE.FRIENDSHIPS, `requester_id=eq.${userId}`],
    ].forEach(([event, table, filter]) => {
        channel.on('postgres_changes', { event, schema: 'public', table, filter }, () => onChange(table));
    });
    channel.subscribe();
    return () => supabase.removeChannel(channel);
}

// Sala do Match ao vivo: broadcast entre os aparelhos, sem gravar nada no banco.
// onStatus recebe 'ready' quando o canal conecta, ou 'error' se não conectar.
export function openLiveRoom(code, clientId, { onMessage, onLeave, onStatus }) {
    const channel = supabase.channel(`match-ao-vivo:${code}`, {
        config: { broadcast: { self: false }, presence: { key: clientId } },
    });
    let ready = false;
    channel
        .on('broadcast', { event: 'msg' }, ({ payload }) => onMessage(payload))
        .on('presence', { event: 'leave' }, ({ key }) => onLeave(key))
        .subscribe(status => {
            if (status === 'SUBSCRIBED' && !ready) {
                ready = true;
                channel.track({ id: clientId });
                onStatus('ready');
            } else if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(status) && !ready) {
                onStatus('error');
            }
        });
    return {
        send: payload => channel.send({ type: 'broadcast', event: 'msg', payload: { ...payload, from: clientId } }),
        close: () => supabase.removeChannel(channel),
    };
}

// Indicações de títulos (database/title_shares.sql). Sem a tabela, a caixa fica oculta.
export function supabaseSendTitleShare(userId, friendId, row) {
    return run('indicar título', () => supabase.from(TABLE.TITLE_SHARES).insert({ from_user: userId, to_user: friendId, ...row }), undefined, duplicateRequest);
}

export function supabaseListTitleShares() {
    return run('listar indicações', () => supabase.rpc('list_title_shares'), data => ({ shares: data || [] }), { shares: [] });
}

export function supabaseDeleteTitleShare(shareId) {
    return run('apagar indicação', () => supabase.from(TABLE.TITLE_SHARES).delete().eq('id', shareId));
}

// ================================================
// HISTÓRICO DE SORTEIOS
// ================================================

export function supabaseGetSorteioHistory(userId) {
    return run('buscar histórico de sorteios',
        () => supabase.from(TABLE.SORTEIO).select('*').eq('user_id', userId).order('sorted_at', { ascending: false }).limit(MAX_SORTEIO_HISTORY),
        data => ({ history: (data || []).map(h => ({ id: h.tmdb_id, title: h.title, poster_path: h.poster_path, media_type: h.media_type })) }),
        { history: [] });
}

export function supabaseAddToSorteioHistory(userId, item) {
    return run('salvar no histórico de sorteios', () => supabase.from(TABLE.SORTEIO).upsert(
        { user_id: userId, ...tmdbTitleRow(item), sorted_at: new Date().toISOString() },
        { onConflict: ON_CONFLICT.TITLE }
    ));
}

export function supabaseClearSorteioHistory(userId) {
    return run('limpar histórico de sorteios', () => supabase.from(TABLE.SORTEIO).delete().eq('user_id', userId));
}

// ================================================
// BLACKLIST (NÃO TENHO INTERESSE)
// ================================================

export function supabaseGetBlacklist(userId) {
    return run('buscar blacklist',
        () => supabase.from(TABLE.BLACKLIST).select('*').eq('user_id', userId).order('added_at', { ascending: false }),
        data => ({ blacklist: data || [] }), { blacklist: [] });
}

export function supabaseAddToBlacklist(userId, item) {
    return run('adicionar à blacklist',
        allowDuplicate(() => supabase.from(TABLE.BLACKLIST).insert({ user_id: userId, ...tmdbTitleRow(item) })),
        data => (data === ALREADY ? { alreadyExists: true } : {}));
}

export function supabaseRemoveFromBlacklist(userId, tmdbId) {
    return run('remover da blacklist', () => supabase.from(TABLE.BLACKLIST).delete().eq('user_id', userId).eq('tmdb_id', tmdbId));
}

export function supabaseClearBlacklist(userId) {
    return run('limpar blacklist', () => supabase.from(TABLE.BLACKLIST).delete().eq('user_id', userId));
}

// ================================================
// PROGRESSO DE EPISÓDIOS (004-series-tracking)
// ================================================

// Idempotente: marcar duas vezes não duplica
export function supabaseMarkEpisodeWatched(userId, series, seasonNumber, episodeNumber) {
    return insertOnce('marcar episódio',
        () => supabase.from(TABLE.EPISODES).insert(episodeRow(userId, series, seasonNumber, episodeNumber)).select().single(),
        'Episódio já marcado');
}

/** Temporada ou série inteira num pedido só; os que já estavam marcados ficam como estão */
export async function supabaseMarkEpisodesWatched(userId, series, episodes) {
    if (!episodes.length) return { success: true };
    return run('marcar episódios', () => supabase.from(TABLE.EPISODES).upsert(
        episodes.map(ep => episodeRow(userId, series, ep.season_number, ep.episode_number)),
        { onConflict: ON_CONFLICT.EPISODE, ignoreDuplicates: true }
    ));
}

export function supabaseUnmarkEpisodeWatched(userId, seriesId, seasonNumber, episodeNumber) {
    return run('desmarcar episódio', () => supabase.from(TABLE.EPISODES).delete()
        .eq('user_id', userId)
        .eq('series_id', seriesId)
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber));
}

/** Todos os episódios da série, de uma vez (série removida da biblioteca volta do zero) */
/** Todos os episódios de uma temporada, num pedido só */
export function supabaseUnmarkSeasonWatched(userId, seriesId, seasonNumber) {
    return run('desmarcar temporada', () => supabase.from(TABLE.EPISODES).delete()
        .eq('user_id', userId).eq('series_id', seriesId).eq('season_number', seasonNumber));
}

export function supabaseClearSeriesProgress(userId, seriesId) {
    return run('limpar progresso da série', () => supabase.from(TABLE.EPISODES).delete().eq('user_id', userId).eq('series_id', seriesId));
}

/** Episódios assistidos de uma série, como Set de chaves "{seriesId}-s{season}-e{episode}" */
export function supabaseGetSeriesProgress(userId, seriesId) {
    return run('buscar progresso da série',
        () => supabase.from(TABLE.EPISODES).select('series_id, season_number, episode_number').eq('user_id', userId).eq('series_id', seriesId),
        data => ({ watchedKeys: new Set((data || []).map(r => buildEpisodeKey(r.series_id, r.season_number, r.episode_number))) }),
        () => ({ watchedKeys: new Set() }));
}

/** Séries com pelo menos 1 episódio assistido (widget Up Next), da mais recente para a mais antiga */
export function supabaseGetAllSeriesInProgress(userId) {
    return run('buscar séries em progresso',
        () => supabase.from(TABLE.EPISODES)
            .select('series_id, series_title, series_poster, media_type, season_number, episode_number')
            .eq('user_id', userId)
            .order('watched_at', { ascending: false }),
        data => {
            const seriesMap = new Map();
            for (const row of (data || [])) {
                if (!seriesMap.has(row.series_id)) {
                    seriesMap.set(row.series_id, {
                        id: row.series_id,
                        title: row.series_title,
                        poster: row.series_poster,
                        type: row.media_type,
                        watchedKeys: new Set(),
                    });
                }
                seriesMap.get(row.series_id).watchedKeys.add(buildEpisodeKey(row.series_id, row.season_number, row.episode_number));
            }
            return { series: [...seriesMap.values()] };
        },
        { series: [] });
}
