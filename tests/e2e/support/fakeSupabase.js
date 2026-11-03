// Substitui o SDK do Supabase no navegador: banco em memória, guardado em sessionStorage para sobreviver ao reload.
// Controlado por window.__TEST = { logged: boolean, failUpsert: boolean, failDelete: boolean }.
(() => {
  const empty = () => ({
    profiles: [{ id: 'u1', username: 'teste', display_name: 'Pessoa Teste', email: 't@t.dev', roulette_wins: 0 }],
    watch_history: [], watchlist: [], user_preferences: [], user_badges: [], sorteio_history: [], blacklist: [], episode_progress: [],
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

      if (this.op === 'insert' || this.op === 'upsert') {
        const isNew = row => !(row.tmdb_id && rows.some(r => r.user_id === row.user_id && r.tmdb_id === row.tmdb_id));
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
        const ch = {
          on(type, filter, cb) { handlers.push({ type, event: filter.event, cb }); return ch; },
          subscribe(cb) {
            if (window.__TEST_NO_REALTIME) { setTimeout(() => cb('CHANNEL_ERROR'), 0); return ch; }
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
