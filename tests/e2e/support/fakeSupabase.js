// Substitui o SDK do Supabase no navegador: banco em memória, guardado em sessionStorage para sobreviver ao reload.
// Controlado por window.__TEST = { logged: boolean, failUpsert: boolean, failDelete: boolean, failListsRead: boolean }.
(() => {
  const empty = () => ({
    profiles: [{ id: 'u1', username: 'teste', display_name: 'Pessoa Teste', email: 't@t.dev', roulette_wins: 0 }],
    watch_history: [], watchlist: [], user_preferences: [], user_badges: [], sorteio_history: [], blacklist: [], episode_progress: [],
    user_lists: [], user_list_items: [],
  });
  const store = JSON.parse(sessionStorage.getItem('__db') || 'null') || empty();
  const save = () => sessionStorage.setItem('__db', JSON.stringify(store));
  window.__db = store;

  class Query {
    constructor(table) { this.table = table; this.filters = []; this.op = 'select'; }
    select() { return this; }
    order() { return this; }
    limit() { return this; }
    eq(key, value) { if (key === 'id') this.ids = [value]; this.filters.push(row => row[key] === value); return this; }
    insert(rows) { this.op = 'insert'; this.value = rows; return this; }
    upsert(rows) { this.op = 'upsert'; this.value = rows; return this; }
    update(row) { this.op = 'update'; this.value = row; return this; }
    delete() { this.op = 'delete'; return this; }
    single() { this.one = true; return this; }
    maybeSingle() { this.one = true; this.soft = true; return this; }
    then(resolve, reject) { return Promise.resolve(this.run()).then(resolve, reject); }

    run() {
      if (this.op === 'upsert' && window.__TEST?.failUpsert) return { data: null, error: { message: 'falha simulada' } };
      const rows = store[this.table] = store[this.table] || [];
      const matched = rows.filter(row => this.filters.every(f => f(row)));
      let out = matched;

      if (this.table === 'title_shares' && this.op === 'insert') {
        if (window.__TEST_NO_SHARES) return { data: null, error: { code: '42P01', message: 'tabela não existe' } };
        const row = this.value;
        if (rows.some(r => r.to_user === row.to_user && r.media_type === row.media_type && r.tmdb_id === row.tmdb_id)) {
          return { data: null, error: { code: '23505', message: 'duplicate key' } };
        }
      }

      if (this.table === 'user_lists' && this.op === 'select' && window.__TEST?.failListsRead) {
        return { data: null, error: { code: '42P01', message: 'tabela não existe' } };
      }
      if (this.table === 'user_lists' && this.op === 'delete') {
        const gone = matched.map(r => r.id); // ON DELETE CASCADE
        store.user_list_items = (store.user_list_items || []).filter(i => !gone.includes(i.list_id));
      }

      if (this.op === 'insert' || this.op === 'upsert') {
        // Listas: o mesmo título pode estar em várias listas da mesma pessoa
        const isNew = row => !(row.tmdb_id && rows.some(r => r.user_id === row.user_id && r.tmdb_id === row.tmdb_id && r.list_id === row.list_id));
        out = [].concat(this.value).filter(row => this.op === 'insert' || isNew(row))
          .map(row => ({ id: crypto.randomUUID(), watched_at: new Date().toISOString(), ...row }));
        rows.push(...out);
      } else if (this.op === 'update') {
        matched.forEach(row => Object.assign(row, this.value));
      } else if (this.op === 'delete') {
        store[this.table] = rows.filter(row => !matched.includes(row));
      }

      if (['friendships', 'match_invites', 'title_shares'].includes(this.table) && (this.op === 'update' || this.op === 'delete')) {
        const id = this.ids?.[0];
        if (id && this.op === 'delete') store.removed = [...(store.removed || []), id];
        if (id && this.op === 'update') store.accepted = [...(store.accepted || []), id];
      }
      if (this.op !== 'select') save();
      if (this.one) {
        return out[0]
          ? { data: out[0], error: null }
          : { data: null, error: this.soft ? null : { code: 'PGRST116', message: 'sem linhas' } };
      }
      return { data: out, error: null };
    }
  }

  const user = { id: 'u1', email: 't@t.dev', get user_metadata() { return store.user_metadata || {}; }, set user_metadata(value) { store.user_metadata = value; } };
  const logged = () => Boolean(window.__TEST?.logged) && !sessionStorage.getItem('__signedOut');

  window.supabase = {
    createClient: () => ({
      from: table => new Query(table),
      // Realtime: abas do mesmo navegador conversam por BroadcastChannel.
      // window.__TEST_NO_REALTIME simula canal fora do ar; window.__liveSent registra o que esta aba mandou.
      channel: (name, opts) => {
        const key = opts?.config?.presence?.key;
        const handlers = [];
        let bc = null;
        window.__rtChannels = window.__rtChannels || new Set();
        // window.__realtimeEmit('postgres_changes', 'INSERT', 'title_shares') simula uma mudança no banco
        window.__realtimeEmit = window.__realtimeEmit || ((type, event, table) => window.__rtChannels.forEach(c => c.emit(type, event, table)));
        const ch = {
          name,
          emit(type, event, table) {
            handlers.filter(h => h.type === type && h.event === event && (!table || h.table === table)).forEach(h => h.cb({}));
          },
          on(type, filter, cb) { handlers.push({ type, event: filter.event, table: filter.table, cb }); return ch; },
          subscribe(cb = () => {}) {
            if (window.__TEST_NO_REALTIME) { setTimeout(() => cb('CHANNEL_ERROR'), 0); return ch; }
            window.__rtChannels.add(ch);
            bc = new BroadcastChannel(`rt:${name}`);
            bc.onmessage = ({ data }) => handlers
              .filter(h => h.type === data.type && h.event === data.event)
              .forEach(h => h.cb(data.body));
            setTimeout(() => cb('SUBSCRIBED'), 0);
            return ch;
          },
          send({ event, payload }) {
            window.__liveSent = [...(window.__liveSent || []), payload];
            bc?.postMessage({ type: 'broadcast', event, body: { payload } });
            return Promise.resolve('ok');
          },
          track() { return Promise.resolve('ok'); },
          unsubscribe() {
            window.__rtChannels.delete(ch);
            bc?.postMessage({ type: 'presence', event: 'leave', body: { key, leftPresences: [{ id: key }] } });
            bc?.close();
            bc = null;
            return Promise.resolve('ok');
          },
        };
        return ch;
      },
      removeChannel: ch => ch.unsubscribe(),
      rpc: async (name, args) => {
        const seed = window.__seed || {};
        const friendsMissing = window.__TEST_NO_FRIENDS;
        if (['find_user_by_username', 'list_friends', 'list_match_invites', 'get_friend_profile'].includes(name) && friendsMissing) {
          return { data: null, error: { code: 'PGRST202', message: 'função não existe' } };
        }
        if (name === 'find_user_by_username') {
          const wanted = args.p_username.toLowerCase();
          return { data: (seed.users || []).filter(u => u.username === wanted), error: null };
        }
        if (name === 'list_friends') {
          const seeded = (seed.friends || []).filter(f => !store.removed?.includes(f.friendship_id))
            .map(f => (store.accepted?.includes(f.friendship_id) ? { ...f, status: 'accepted' } : f));
          const requested = (store.friendships || []).map(f => {
            const other = (seed.users || []).find(u => u.id === f.addressee_id) || {};
            return { friendship_id: f.id, other_id: f.addressee_id, username: other.username, display_name: other.display_name, status: f.status || 'pending', direction: 'sent' };
          });
          return { data: [...seeded, ...requested], error: null };
        }
        if (name === 'get_friend_profile') {
          if (window.__TEST_NO_PROFILE) return { data: null, error: { code: 'PGRST202', message: 'função não existe' } };
          return { data: seed.profiles?.[args.p_friend] || null, error: null };
        }
        if (name === 'list_title_shares') {
          if (friendsMissing || window.__TEST_NO_SHARES) return { data: null, error: { code: 'PGRST202', message: 'função não existe' } };
          return { data: (seed.shares || []).filter(s => !store.removed?.includes(s.id)), error: null };
        }
        if (name === 'set_title_reaction') {
          if (window.__TEST?.failReaction) return { data: null, error: { code: 'PGRST202', message: 'função não existe' } };
          const row = store.watch_history.find(r => r.user_id === 'u1' && r.tmdb_id === args.p_tmdb_id);
          if (row) { row.reaction = args.p_reaction; save(); }
          return { data: Boolean(row), error: null };
        }
        // Listas, parte 2 (database/user_lists.sql)
        if (name === 'reorder_list_items') {
          if (window.__TEST?.failReorder) return { data: null, error: { code: 'PGRST202', message: 'função não existe' } };
          store.user_list_items.filter(i => i.list_id === args.p_list_id).forEach(i => {
            const pos = args.p_tmdb_ids.indexOf(i.tmdb_id);
            i.position = pos === -1 ? i.position : pos + 1;
          });
          save();
          return { data: null, error: null };
        }
        if (name === 'set_list_sharing') {
          const list = (store.user_lists || []).find(l => l.id === args.p_list_id && l.user_id === 'u1');
          if (!list) return { data: null, error: null };
          list.share_token = args.p_on ? (list.share_token || crypto.randomUUID()) : null;
          save();
          return { data: list.share_token, error: null };
        }
        if (name === 'get_shared_list') {
          // Listas de outras pessoas vêm de window.__seed.sharedLists[token]; as próprias, do banco simulado
          const fromSeed = seed.sharedLists?.[args.p_token];
          if (fromSeed) return { data: fromSeed, error: null };
          const list = (store.user_lists || []).find(l => l.share_token && l.share_token === args.p_token);
          if (!list) return { data: null, error: null };
          const mine = logged() && list.user_id === 'u1';
          const items = (store.user_list_items || []).filter(i => i.list_id === list.id)
            .sort((x, y) => (x.position ?? Infinity) - (y.position ?? Infinity));
          return { data: { name: list.name, emoji: list.emoji, owner: 'Pessoa Teste', is_mine: mine, list_id: mine ? list.id : null, items }, error: null };
        }
        if (name === 'list_match_invites') {
          return { data: (seed.invites || []).filter(i => !store.removed?.includes(i.id)), error: null };
        }
        return { data: 1, error: null };
      },
      functions: {
        invoke: async (name) => {
          window.__functionCalls = [...(window.__functionCalls || []), name];
          return window.__TEST?.failDelete
            ? { data: null, error: new Error('falha simulada') }
            : { data: { deleted: true }, error: null };
        },
      },
      auth: {
        getUser: async () => ({ data: { user: logged() ? user : null }, error: null }),
        getSession: async () => ({ data: { session: logged() ? { user } : null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        updateUser: async ({ data }) => { store.user_metadata = { ...store.user_metadata, ...data }; save(); return { data: { user }, error: null }; },
        signOut: async () => { sessionStorage.setItem('__signedOut', '1'); return { error: null }; },
      },
    }),
  };
})();
