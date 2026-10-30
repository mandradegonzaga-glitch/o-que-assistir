// Cliente Supabase e todas as chamadas ao banco
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/constants.js';

// Aviso de erro fatal na própria página (ainda não há interface pronta nesse ponto)
function showFatalError(message) {
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.className = 'fatal-error';
    box.textContent = message;
    document.body.prepend(box);
}

// Verificar se SDK do Supabase está carregado
if (typeof window.supabase === 'undefined') {
    showFatalError('Não foi possível carregar o app.\nVerifique a conexão com a internet e se algum bloqueador (AdBlock/firewall) está impedindo o carregamento, depois recarregue a página.');
    throw new Error('Supabase SDK não carregou');
}

export let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    showFatalError('Não foi possível conectar ao servidor. Recarregue a página; se continuar, tente mais tarde.');
    throw error;
}

// ================================================
// FUNÇÕES DE AUTENTICAÇÃO
// ================================================

/**
 * Registrar novo usuário
 * @param {string} username - Nome de usuário
 * @param {string} email - Email do usuário
 * @param {string} password - Senha
 */
export async function supabaseRegister(username, email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username,
                    display_name: username
                }
            }
        });

        if (error) throw error;

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Erro ao registrar:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Login de usuário
 * @param {string} email - Email do usuário
 * @param {string} password - Senha
 */
export async function supabaseLogin(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Logout do usuário
 */
export async function supabaseLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obter usuário atual
 */
export async function supabaseGetCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Erro ao obter usuário:', error);
        return null;
    }
}

/**
 * Login como convidado (anônimo)
 */
export async function supabaseLoginAsGuest() {
    try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Erro ao fazer login como convidado:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// FUNÇÕES DE PERFIL
// ================================================

/**
 * Obter perfil do usuário
 * @param {string} userId - ID do usuário
 */
export async function supabaseGetProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return { success: true, profile: data };
    } catch (error) {
        console.error('Erro ao obter perfil:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Atualizar perfil do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} updates - Dados para atualizar
 */
export async function supabaseUpdateProfile(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, profile: data };
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// FUNÇÕES DE HISTÓRICO (WATCH HISTORY)
// ================================================

/**
 * Obter histórico de filmes/séries assistidos
 * @param {string} userId - ID do usuário
 */
export async function supabaseGetWatchHistory(userId) {
    try {
        const { data, error } = await supabase
            .from('watch_history')
            .select('*')
            .eq('user_id', userId)
            .order('watched_at', { ascending: false });

        if (error) throw error;

        // Converter para formato compatível com o código atual
        const history = data.map(item => ({
            id: item.tmdb_id,
            title: item.title,
            poster: item.poster_path,
            type: item.media_type,
            year: item.release_year,
            genres: item.genres,
            watchedAt: item.watched_at
        }));

        return { success: true, history };
    } catch (error) {
        console.error('Erro ao obter histórico:', error);
        return { success: false, error: error.message, history: [] };
    }
}

/**
 * Adicionar filme/série ao histórico
 * @param {string} userId - ID do usuário
 * @param {Object} item - Dados do filme/série
 */
export async function supabaseAddToHistory(userId, item) {
    try {
        const { data, error } = await supabase
            .from('watch_history')
            .insert({
                user_id: userId,
                tmdb_id: item.id,
                title: item.title,
                poster_path: item.poster,
                media_type: item.type,
                release_year: item.year,
                genres: item.genres
            })
            .select()
            .single();

        if (error) {
            // Se for erro de duplicação, é ok
            if (error.code === '23505') {
                return { success: true, message: 'Item já existe no histórico' };
            }
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Erro ao adicionar ao histórico:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remover item do histórico
 * @param {string} userId - ID do usuário
 * @param {number} tmdbId - ID do TMDB
 */
export async function supabaseRemoveFromHistory(userId, tmdbId) {
    try {
        const { error } = await supabase
            .from('watch_history')
            .delete()
            .eq('user_id', userId)
            .eq('tmdb_id', tmdbId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao remover do histórico:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// FUNÇÕES DE WATCHLIST (LISTA DE DESEJOS)
// ================================================

/**
 * Obter watchlist do usuário
 * @param {string} userId - ID do usuário
 */
export async function supabaseGetWatchlist(userId) {
    try {
        const { data, error } = await supabase
            .from('watchlist')
            .select('*')
            .eq('user_id', userId)
            .order('added_at', { ascending: false });

        if (error) throw error;

        // Converter para formato compatível
        const watchlist = data.map(item => ({
            id: item.tmdb_id,
            title: item.title,
            poster: item.poster_path,
            type: item.media_type
        }));

        return { success: true, watchlist };
    } catch (error) {
        console.error('Erro ao obter watchlist:', error);
        return { success: false, error: error.message, watchlist: [] };
    }
}

/**
 * Adicionar à watchlist
 * @param {string} userId - ID do usuário
 * @param {Object} item - Dados do filme/série
 */
export async function supabaseAddToWatchlist(userId, item) {
    try {
        const { data, error } = await supabase
            .from('watchlist')
            .insert({
                user_id: userId,
                tmdb_id: item.id,
                title: item.title,
                poster_path: item.poster,
                media_type: item.type
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return { success: true, message: 'Item já existe na watchlist' };
            }
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Erro ao adicionar à watchlist:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remover da watchlist
 * @param {string} userId - ID do usuário
 * @param {number} tmdbId - ID do TMDB
 */
export async function supabaseRemoveFromWatchlist(userId, tmdbId) {
    try {
        const { error } = await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', userId)
            .eq('tmdb_id', tmdbId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao remover da watchlist:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// FUNÇÕES DE PREFERÊNCIAS
// ================================================

/**
 * Obter preferências do usuário
 * @param {string} userId - ID do usuário
 */
export async function supabaseGetPreferences(userId) {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return { success: true, preferences: data };
    } catch (error) {
        console.error('Erro ao obter preferências:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Atualizar preferências do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} preferences - Preferências
 */
export async function supabaseUpdatePreferences(userId, preferences) {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: userId,
                ...preferences
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, preferences: data };
    } catch (error) {
        console.error('Erro ao atualizar preferências:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// FUNÇÕES DE BADGES/CONQUISTAS
// ================================================

/**
 * Obter badges do usuário
 * @param {string} userId - ID do usuário
 */
export async function supabaseGetBadges(userId) {
    try {
        const { data, error } = await supabase
            .from('user_badges')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true, badges: data };
    } catch (error) {
        console.error('Erro ao obter badges:', error);
        return { success: false, error: error.message, badges: [] };
    }
}

/**
 * Desbloquear badge
 * @param {string} userId - ID do usuário
 * @param {string} badgeName - Nome do badge
 */
export async function supabaseUnlockBadge(userId, badgeName) {
    try {
        const { data, error } = await supabase
            .from('user_badges')
            .insert({
                user_id: userId,
                badge_name: badgeName
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return { success: true, message: 'Badge já desbloqueado' };
            }
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Erro ao desbloquear badge:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verificar se badge está desbloqueado
 * @param {string} userId - ID do usuário
 * @param {string} badgeName - Nome do badge
 */
export async function supabaseCheckBadge(userId, badgeName) {
    try {
        const { data, error } = await supabase
            .from('user_badges')
            .select('*')
            .eq('user_id', userId)
            .eq('badge_name', badgeName)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return { success: true, unlocked: !!data };
    } catch (error) {
        console.error('Erro ao verificar badge:', error);
        return { success: false, error: error.message, unlocked: false };
    }
}

// ================================================
// FUNÇÃO DE INCREMENTO DE VITÓRIAS DA ROLETA
// ================================================

/**
 * Incrementar vitórias da roleta
 * @param {string} userId - ID do usuário
 */
export async function supabaseIncrementRouletteWins(userId) {
    try {
        // Obter contagem atual
        const { data: profile } = await supabase
            .from('profiles')
            .select('roulette_wins')
            .eq('id', userId)
            .single();

        const currentWins = profile?.roulette_wins || 0;

        // Incrementar
        const { data, error } = await supabase
            .from('profiles')
            .update({ roulette_wins: currentWins + 1 })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, wins: data.roulette_wins };
    } catch (error) {
        console.error('Erro ao incrementar vitórias:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// LISTENER DE MUDANÇAS DE AUTENTICAÇÃO
// ================================================

/**
 * Observar mudanças de autenticação
 * @param {Function} callback - Função chamada quando autenticação muda
 */
export function supabaseOnAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// ================================================
// ALTERAR SENHA
// ================================================

/**
 * Alterar senha do usuário
 * @param {string} newPassword - Nova senha
 */
export async function supabaseChangePassword(newPassword) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// RECUPERAR SENHA (ESQUECI MINHA SENHA)
// ================================================

/**
 * Enviar email de recuperação de senha
 * @param {string} email - Email do usuário
 */
export async function supabaseResetPassword(email) {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname
        });

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Erro ao enviar email de recuperação:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// DELETAR CONTA
// ================================================

/**
 * Deletar conta do usuário (dados do banco)
 * Nota: Isso deleta os dados das tabelas. O usuário em auth.users
 * precisa ser deletado via Supabase Dashboard ou Edge Function.
 * @param {string} userId - ID do usuário
 */
export async function supabaseDeleteUserData(userId) {
    try {
        // Deletar em ordem para respeitar foreign keys
        // 1. Badges
        await supabase.from('user_badges').delete().eq('user_id', userId);

        // 2. Preferências
        await supabase.from('user_preferences').delete().eq('user_id', userId);

        // 3. Watchlist
        await supabase.from('watchlist').delete().eq('user_id', userId);

        // 4. Progresso de episódios
        await supabase.from('episode_progress').delete().eq('user_id', userId);

        // 5. Histórico
        await supabase.from('watch_history').delete().eq('user_id', userId);

        // 6. Perfil (isso deve ser por último devido ao CASCADE)
        const { error } = await supabase.from('profiles').delete().eq('id', userId);

        if (error) throw error;

        // 7. Fazer logout
        await supabase.auth.signOut();

        return { success: true };
    } catch (error) {
        console.error('Erro ao deletar conta:', error);
        return { success: false, error: error.message };
    }
}

// ================================================
// HISTÓRICO DE SORTEIOS
// ================================================

/**
 * Obter histórico de sorteios
 * @param {string} userId - ID do usuário
 */
export async function supabaseGetSorteioHistory(userId) {
    try {
        const { data, error } = await supabase
            .from('sorteio_history')
            .select('*')
            .eq('user_id', userId)
            .order('sorted_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return { success: true, history: data || [] };
    } catch (error) {
        console.error('Erro ao buscar histórico de sorteios:', error);
        return { success: false, history: [] };
    }
}

/**
 * Adicionar ao histórico de sorteios
 * @param {string} userId - ID do usuário
 * @param {Object} item - Dados do filme/série
 */
export async function supabaseAddToSorteioHistory(userId, item) {
    try {
        const { data, error } = await supabase
            .from('sorteio_history')
            .upsert({
                user_id: userId,
                tmdb_id: item.id,
                title: item.title || item.name,
                poster_path: item.poster_path,
                media_type: item.media_type || 'movie',
                sorted_at: new Date().toISOString()
            }, { onConflict: 'user_id,tmdb_id' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao salvar no histórico de sorteios:', error);
        return { success: false };
    }
}

/**
 * Limpar histórico de sorteios
 * @param {string} userId - ID do usuário
 */
export async function supabaseClearSorteioHistory(userId) {
    try {
        const { error } = await supabase
            .from('sorteio_history')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao limpar histórico de sorteios:', error);
        return { success: false };
    }
}

// ================================================
// BLACKLIST (NÃO TENHO INTERESSE)
// ================================================

/**
 * Obter blacklist do usuário
 * @param {string} userId - ID do usuário
 */
export async function supabaseGetBlacklist(userId) {
    try {
        const { data, error } = await supabase
            .from('blacklist')
            .select('*')
            .eq('user_id', userId)
            .order('added_at', { ascending: false });

        if (error) throw error;
        return { success: true, blacklist: data || [] };
    } catch (error) {
        console.error('Erro ao buscar blacklist:', error);
        return { success: false, blacklist: [] };
    }
}

/**
 * Adicionar à blacklist
 * @param {string} userId - ID do usuário
 * @param {Object} item - Dados do filme/série
 */
export async function supabaseAddToBlacklist(userId, item) {
    try {
        const { data, error } = await supabase
            .from('blacklist')
            .insert({
                user_id: userId,
                tmdb_id: item.id,
                title: item.title || item.name,
                poster_path: item.poster_path,
                media_type: item.media_type || 'movie'
            });

        if (error) {
            if (error.code === '23505') {
                return { success: true, alreadyExists: true };
            }
            throw error;
        }
        return { success: true };
    } catch (error) {
        console.error('Erro ao adicionar à blacklist:', error);
        return { success: false };
    }
}

/**
 * Remover da blacklist
 * @param {string} userId - ID do usuário
 * @param {number} tmdbId - ID do TMDB
 */
export async function supabaseRemoveFromBlacklist(userId, tmdbId) {
    try {
        const { error } = await supabase
            .from('blacklist')
            .delete()
            .eq('user_id', userId)
            .eq('tmdb_id', tmdbId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao remover da blacklist:', error);
        return { success: false };
    }
}

/**
 * Limpar toda a blacklist
 * @param {string} userId - ID do usuário
 */
export async function supabaseClearBlacklist(userId) {
    try {
        const { error } = await supabase
            .from('blacklist')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao limpar blacklist:', error);
        return { success: false };
    }
}

// ================================================
// PROGRESSO DE EPISÓDIOS (004-series-tracking)
// ================================================

/**
 * Marcar episódio como assistido.
 * Idempotente: chamar duas vezes não duplica o registro.
 *
 * @param {string} userId - ID do usuário
 * @param {Object} series - { id, title, poster, type }
 * @param {number} seasonNumber
 * @param {number} episodeNumber
 */
export async function supabaseMarkEpisodeWatched(userId, series, seasonNumber, episodeNumber) {
    try {
        const { data, error } = await supabase
            .from('episode_progress')
            .insert({
                user_id: userId,
                series_id: series.id,
                series_title: series.title,
                series_poster: series.poster || null,
                media_type: series.type || 'tv',
                season_number: seasonNumber,
                episode_number: episodeNumber,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return { success: true, message: 'Episódio já marcado' };
            }
            throw error;
        }

        return { success: true, data };
    } catch (error) {
        console.error('Erro ao marcar episódio:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Desmarcar episódio como assistido.
 *
 * @param {string} userId - ID do usuário
 * @param {number} seriesId
 * @param {number} seasonNumber
 * @param {number} episodeNumber
 */
export async function supabaseUnmarkEpisodeWatched(userId, seriesId, seasonNumber, episodeNumber) {
    try {
        const { error } = await supabase
            .from('episode_progress')
            .delete()
            .eq('user_id', userId)
            .eq('series_id', seriesId)
            .eq('season_number', seasonNumber)
            .eq('episode_number', episodeNumber);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao desmarcar episódio:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Buscar todos os episódios assistidos de uma série específica.
 * Retorna Set de chaves no formato "{seriesId}-s{season}-e{episode}".
 *
 * @param {string} userId - ID do usuário
 * @param {number} seriesId
 * @returns {{ success: boolean, watchedKeys: Set<string> }}
 */
export async function supabaseGetSeriesProgress(userId, seriesId) {
    try {
        const { data, error } = await supabase
            .from('episode_progress')
            .select('series_id, season_number, episode_number')
            .eq('user_id', userId)
            .eq('series_id', seriesId);

        if (error) throw error;

        const watchedKeys = new Set(
            (data || []).map(r => `${r.series_id}-s${r.season_number}-e${r.episode_number}`)
        );

        return { success: true, watchedKeys };
    } catch (error) {
        console.error('Erro ao buscar progresso da série:', error);
        return { success: false, watchedKeys: new Set() };
    }
}

/**
 * Buscar todas as séries com pelo menos 1 episódio assistido.
 * Usado pelo widget Up Next.
 *
 * @param {string} userId - ID do usuário
 * @returns {{ success: boolean, series: Array }}
 */
export async function supabaseGetAllSeriesInProgress(userId) {
    try {
        const { data, error } = await supabase
            .from('episode_progress')
            .select('series_id, series_title, series_poster, media_type, season_number, episode_number')
            .eq('user_id', userId)
            .order('watched_at', { ascending: false });

        if (error) throw error;

        // Agrupar por série e montar Set de chaves por série
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
            const key = `${row.series_id}-s${row.season_number}-e${row.episode_number}`;
            seriesMap.get(row.series_id).watchedKeys.add(key);
        }

        return { success: true, series: [...seriesMap.values()] };
    } catch (error) {
        console.error('Erro ao buscar séries em progresso:', error);
        return { success: false, series: [] };
    }
}
