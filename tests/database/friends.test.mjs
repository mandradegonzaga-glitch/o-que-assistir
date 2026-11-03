// Roda database/friends.sql em um Postgres real, descartável (PGlite), e testa as regras de acesso.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ANA = '00000000-0000-4000-8000-00000000000a';
const BIA = '00000000-0000-4000-8000-00000000000b';
const CAU = '00000000-0000-4000-8000-00000000000c';

let db;

// Simula o Supabase: papel + usuário do token
async function as(userId, fn) {
  await db.exec(`SET ROLE ${userId ? 'authenticated' : 'anon'}; SELECT set_config('app.uid', '${userId || ''}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec('RESET ROLE;');
  }
}

const denied = async (promise, message) => assert.rejects(promise, /row-level security|permission denied|violates/, message);
const rows = async (sql, params) => (await db.query(sql, params)).rows;

before(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    CREATE TABLE profiles (id uuid PRIMARY KEY, username text UNIQUE NOT NULL, display_name text, email text, roulette_wins int DEFAULT 0);
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    CREATE TABLE watch_history (user_id uuid REFERENCES profiles(id) ON DELETE CASCADE, tmdb_id int, title text, poster_path text, media_type text, release_year text, genres int[], watched_at timestamptz DEFAULT now());
    CREATE TABLE watchlist (user_id uuid REFERENCES profiles(id) ON DELETE CASCADE, tmdb_id int, title text, poster_path text, media_type text, added_at timestamptz DEFAULT now());
    CREATE TABLE user_badges (user_id uuid REFERENCES profiles(id) ON DELETE CASCADE, badge_name text);
    ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
    INSERT INTO profiles VALUES
      ('${ANA}', 'ana', 'Ana', 'ana@x.dev'), ('${BIA}', 'bia', 'Bia', 'bia@x.dev'), ('${CAU}', 'cau', NULL, 'cau@x.dev');
    INSERT INTO watch_history (user_id, tmdb_id, title, media_type) VALUES ('${BIA}', 603, 'Matrix', 'movie');
    INSERT INTO watchlist (user_id, tmdb_id, title, media_type) VALUES ('${BIA}', 550, 'Clube da Luta', 'movie');
    INSERT INTO user_badges VALUES ('${BIA}', 'Iniciante');
  `);
  const sql = readFileSync(new URL('../../database/friends.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql); // o arquivo pode rodar de novo sem erro
  const shares = readFileSync(new URL('../../database/title_shares.sql', import.meta.url), 'utf8');
  await db.exec(shares);
  await db.exec(shares);
});

after(() => db.close());

test('busca por username: exato, sem diferenciar maiúsculas, sem expor email', async () => {
  const found = await as(ANA, () => rows('SELECT * FROM find_user_by_username($1)', [' BIA ']));
  assert.deepEqual(found, [{ id: BIA, username: 'bia', display_name: 'Bia' }]);
  assert.equal(await as(ANA, () => rows('SELECT * FROM find_user_by_username($1)', ['bi'])).then(r => r.length), 0, 'parte do nome não encontra');
  assert.equal(await as(ANA, () => rows('SELECT * FROM find_user_by_username($1)', ['bia@x.dev'])).then(r => r.length), 0, 'email não encontra');
  assert.equal(await as(ANA, () => rows('SELECT * FROM find_user_by_username($1)', ['ana'])).then(r => r.length), 0, 'não acha a si mesma');
});

test('sem login não busca nem lista', async () => {
  await denied(as(null, () => rows('SELECT * FROM find_user_by_username($1)', ['bia'])));
  await denied(as(null, () => rows('SELECT * FROM list_friends()')));
  await denied(as(null, () => rows('SELECT * FROM friendships')));
});

test('pedido: só em nome próprio e sempre pendente', async () => {
  await denied(as(ANA, () => rows('INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)', [BIA, CAU])), 'em nome de outra pessoa');
  await denied(as(ANA, () => rows(`INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'accepted')`, [ANA, BIA])), 'já aceito');
  await denied(as(ANA, () => rows('INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $1)', [ANA])), 'consigo mesma');
  await as(ANA, () => rows('INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)', [ANA, BIA]));
});

test('não existe segundo vínculo, nem na direção contrária', async () => {
  await denied(as(BIA, () => rows('INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)', [BIA, ANA])));
});

test('convite antes de aceitar é recusado', async () => {
  await denied(as(ANA, () => rows('INSERT INTO match_invites (from_user, to_user, payload) VALUES ($1, $2, $3)', [ANA, BIA, 'x'])));
});

const friendProfile = (viewer, target) => as(viewer, async () => (await rows('SELECT get_friend_profile($1) AS p', [target]))[0].p);

test('perfil: pedido pendente ainda não mostra nada', async () => {
  assert.equal(await friendProfile(ANA, BIA), null);
  assert.equal(await friendProfile(BIA, ANA), null);
});

test('só quem recebeu aceita, e aceitar não troca os envolvidos', async () => {
  const accept = `UPDATE friendships SET status = 'accepted' WHERE addressee_id = '${BIA}'`;
  await as(ANA, async () => {
    const result = await db.query(accept);
    assert.equal(result.affectedRows, 0, 'quem pediu não aceita o próprio pedido');
  });
  await as(CAU, async () => {
    const result = await db.query(accept);
    assert.equal(result.affectedRows, 0, 'terceiros não aceitam');
  });
  await denied(as(BIA, () => rows(`UPDATE friendships SET requester_id = '${CAU}' WHERE addressee_id = '${BIA}'`)), 'trocar quem pediu');
  await as(BIA, async () => {
    const result = await db.query(accept);
    assert.equal(result.affectedRows, 1);
  });
});

test('cada pessoa vê só as próprias amizades, com o mínimo do outro', async () => {
  const ana = await as(ANA, () => rows('SELECT * FROM list_friends()'));
  assert.equal(ana.length, 1);
  assert.deepEqual(
    { other: ana[0].other_id, username: ana[0].username, status: ana[0].status, direction: ana[0].direction },
    { other: BIA, username: 'bia', status: 'accepted', direction: 'sent' },
  );
  assert.equal(Object.keys(ana[0]).includes('email'), false);
  assert.equal((await as(BIA, () => rows('SELECT * FROM list_friends()')))[0].direction, 'received');
  assert.equal((await as(CAU, () => rows('SELECT * FROM list_friends()'))).length, 0);
  assert.equal((await as(CAU, () => rows('SELECT * FROM friendships'))).length, 0);
});

test('perfil: amigo vê o que a pessoa assistiu, a lista e as conquistas, e nada além', async () => {
  const profile = await friendProfile(ANA, BIA);
  assert.deepEqual(profile.history.map(h => h.title), ['Matrix']);
  assert.deepEqual(profile.watchlist.map(w => w.title), ['Clube da Luta']);
  assert.deepEqual(profile.badges, ['Iniciante']);
  assert.equal(JSON.stringify(profile).includes('bia@x.dev'), false, 'não expõe email');
  assert.equal('user_id' in profile.history[0], false);
});

test('perfil: quem não é amigo não vê, nem sem login', async () => {
  assert.equal(await friendProfile(CAU, BIA), null, 'desconhecido');
  assert.equal(await friendProfile(ANA, CAU), null);
  assert.equal(await friendProfile(BIA, BIA), null, 'consigo mesma');
  await denied(friendProfile(null, BIA));
  await denied(as(ANA, () => rows('SELECT * FROM watch_history')), 'tabela direta');
});

test('perfil: quem desliga o compartilhamento não envia dados nem para amigos', async () => {
  await db.exec(`UPDATE profiles SET share_with_friends = FALSE WHERE id = '${BIA}'`);
  const hidden = await friendProfile(ANA, BIA);
  assert.equal(hidden.private, true);
  assert.equal(hidden.username, 'bia');
  assert.deepEqual([hidden.history, hidden.watchlist, hidden.badges], [[], [], []]);
  assert.equal(JSON.stringify(hidden).includes('Matrix'), false);

  await db.exec(`UPDATE profiles SET share_with_friends = TRUE WHERE id = '${BIA}'`);
  const visible = await friendProfile(ANA, BIA);
  assert.equal(visible.private, false);
  assert.equal(visible.history.length, 1);
});

test('perfis continuam privados', async () => {
  await denied(as(ANA, () => rows('SELECT email FROM profiles')));
});

test('convites: só entre amigos, em nome próprio, e só para quem envolve', async () => {
  await denied(as(CAU, () => rows('INSERT INTO match_invites (from_user, to_user, payload) VALUES ($1, $2, $3)', [CAU, ANA, 'x'])), 'desconhecido');
  await denied(as(ANA, () => rows('INSERT INTO match_invites (from_user, to_user, payload) VALUES ($1, $2, $3)', [BIA, ANA, 'x'])), 'em nome da amiga');
  await denied(as(ANA, () => rows('INSERT INTO match_invites (from_user, to_user, payload) VALUES ($1, $2, $3)', [ANA, BIA, 'x'.repeat(2001)])), 'grande demais');

  await as(ANA, () => rows('INSERT INTO match_invites (from_user, to_user, payload) VALUES ($1, $2, $3)', [ANA, BIA, 'codigo']));

  const inbox = await as(BIA, () => rows('SELECT from_name, payload FROM list_match_invites()'));
  assert.deepEqual(inbox, [{ from_name: 'Ana', payload: 'codigo' }]);
  assert.equal((await as(ANA, () => rows('SELECT * FROM list_match_invites()'))).length, 0, 'quem enviou não vê na caixa');
  assert.equal((await as(CAU, () => rows('SELECT * FROM match_invites'))).length, 0, 'terceiros não veem');

  await as(CAU, async () => {
    assert.equal((await db.query('DELETE FROM match_invites')).affectedRows, 0, 'terceiros não apagam');
  });
  await as(BIA, async () => {
    assert.equal((await db.query('DELETE FROM match_invites')).affectedRows, 1);
  });
});

const share = (from, to, extra = {}) => {
  const row = { media_type: 'movie', tmdb_id: 603, title: 'Matrix', poster_path: '/abc.jpg', ...extra };
  return rows('INSERT INTO title_shares (from_user, to_user, media_type, tmdb_id, title, poster_path) VALUES ($1, $2, $3, $4, $5, $6)',
    [from, to, row.media_type, row.tmdb_id, row.title, row.poster_path]);
};

test('indicações: só entre amigos, em nome próprio, dados válidos, uma vez por título', async () => {
  await denied(as(CAU, () => share(CAU, ANA)), 'desconhecido');
  await denied(as(ANA, () => share(BIA, ANA)), 'em nome da amiga');
  await denied(as(null, () => share(ANA, BIA)), 'sem login');
  await denied(as(ANA, () => share(ANA, BIA, { media_type: 'anime' })), 'tipo inválido');
  await denied(as(ANA, () => share(ANA, BIA, { tmdb_id: 0 })), 'id inválido');
  await denied(as(ANA, () => share(ANA, BIA, { title: '' })), 'sem título');
  await denied(as(ANA, () => share(ANA, BIA, { poster_path: 'https://mal.dev/x.jpg' })), 'pôster de fora');
  await denied(as(ANA, () => share(ANA, BIA, { poster_path: '/../x.jpg' })), 'pôster com caminho');

  await as(ANA, () => share(ANA, BIA));
  await assert.rejects(as(ANA, () => share(ANA, BIA)), /duplicate key|unique/, 'mesmo título de novo');
  await as(ANA, () => share(ANA, BIA, { media_type: 'dorama', tmdb_id: 1, title: 'Dorama', poster_path: null }));

  const inbox = await as(BIA, () => rows('SELECT from_name, media_type, tmdb_id, title, poster_path FROM list_title_shares()'));
  assert.equal(inbox.length, 2);
  assert.deepEqual(inbox.find(i => i.tmdb_id === 603), { from_name: 'Ana', media_type: 'movie', tmdb_id: 603, title: 'Matrix', poster_path: '/abc.jpg' });
  assert.equal((await as(ANA, () => rows('SELECT * FROM list_title_shares()'))).length, 0, 'quem enviou não vê na caixa');
  assert.equal((await as(CAU, () => rows('SELECT * FROM title_shares'))).length, 0, 'terceiros não veem');
  await denied(as(null, () => rows('SELECT * FROM list_title_shares()')), 'sem login não lista');

  await as(CAU, async () => {
    assert.equal((await db.query('DELETE FROM title_shares')).affectedRows, 0, 'terceiros não apagam');
  });
  await as(BIA, async () => {
    assert.equal((await db.query('DELETE FROM title_shares WHERE tmdb_id = 1')).affectedRows, 1);
  });
  await denied(as(BIA, () => rows(`UPDATE title_shares SET title = 'outro'`)), 'ninguém edita');
});

test('desfazer amizade: só os envolvidos, e o convite e o perfil deixam de ser possíveis', async () => {
  await as(CAU, async () => {
    assert.equal((await db.query('DELETE FROM friendships')).affectedRows, 0);
  });
  await as(BIA, async () => {
    assert.equal((await db.query('DELETE FROM friendships')).affectedRows, 1);
  });
  await denied(as(ANA, () => rows('INSERT INTO match_invites (from_user, to_user, payload) VALUES ($1, $2, $3)', [ANA, BIA, 'x'])));
  await denied(as(ANA, () => share(ANA, BIA, { tmdb_id: 2 })), 'indicação depois de desfazer');
  assert.equal(await friendProfile(ANA, BIA), null);
});

test('apagar um perfil leva amizades, convites e indicações junto', async () => {
  await db.exec(`
    INSERT INTO friendships (requester_id, addressee_id, status) VALUES ('${ANA}', '${CAU}', 'accepted');
    INSERT INTO match_invites (from_user, to_user, payload) VALUES ('${ANA}', '${CAU}', 'x');
    INSERT INTO title_shares (from_user, to_user, media_type, tmdb_id, title) VALUES ('${ANA}', '${CAU}', 'tv', 5, 'Série');
    DELETE FROM profiles WHERE id = '${CAU}';
  `);
  assert.equal((await rows('SELECT * FROM friendships')).length, 0);
  assert.equal((await rows('SELECT * FROM match_invites')).length, 0);
  assert.equal((await rows(`SELECT * FROM title_shares WHERE to_user = '${CAU}'`)).length, 0);
});
