// Roda database/user_lists.sql em um Postgres real, descartável (PGlite), e testa as regras de acesso.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const ANA = '00000000-0000-4000-8000-00000000000a';
const BIA = '00000000-0000-4000-8000-00000000000b';

let db;

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
const newList = (name, emoji = '🎃') => rows('INSERT INTO user_lists (user_id, name, emoji) VALUES (auth.uid(), $1, $2) RETURNING id', [name, emoji]).then(r => r[0].id);
const addItem = (listId, tmdbId, title = 'Título') => rows(
  'INSERT INTO user_list_items (list_id, user_id, tmdb_id, media_type, title, poster_path) VALUES ($1, auth.uid(), $2, $3, $4, $5)',
  [listId, tmdbId, 'movie', title, '/abc.jpg'],
);

before(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    CREATE TABLE profiles (id uuid PRIMARY KEY, username text UNIQUE NOT NULL, display_name text, email text);
    INSERT INTO profiles VALUES ('${ANA}', 'ana', 'Ana', 'ana@x.dev'), ('${BIA}', 'bia', NULL, 'bia@x.dev');
  `);
  const sql = readFileSync(new URL('../../database/user_lists.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql); // o arquivo pode rodar de novo sem erro
});

after(() => db.close());

test('cada pessoa cria, vê, renomeia e apaga só as próprias listas', async () => {
  const anaList = await as(ANA, () => newList('Maratona Halloween'));
  await as(BIA, () => newList('Com a namorada', '❤️'));

  const seen = await as(ANA, () => rows('SELECT name, emoji FROM user_lists'));
  assert.deepEqual(seen, [{ name: 'Maratona Halloween', emoji: '🎃' }], 'Ana não vê a lista da Bia');

  await as(BIA, () => rows('UPDATE user_lists SET name = $1 WHERE id = $2', ['Invadida', anaList]));
  await as(BIA, () => rows('DELETE FROM user_lists WHERE id = $1', [anaList]));
  const [still] = await rows('SELECT name FROM user_lists WHERE id = $1', [anaList]);
  assert.equal(still.name, 'Maratona Halloween', 'Bia não renomeia nem apaga a lista da Ana');

  await as(ANA, () => rows('UPDATE user_lists SET name = $1, emoji = $2 WHERE id = $3', ['Halloween', '👻', anaList]));
  const [renamed] = await rows('SELECT name, emoji FROM user_lists WHERE id = $1', [anaList]);
  assert.deepEqual(renamed, { name: 'Halloween', emoji: '👻' });

  await denied(as(ANA, () => rows('UPDATE user_lists SET user_id = $1 WHERE id = $2', [BIA, anaList])), 'o dono não muda');
  await denied(as(ANA, () => rows('INSERT INTO user_lists (user_id, name) VALUES ($1, $2)', [BIA, 'Presente'])), 'não cria lista para outra pessoa');
});

test('nome: obrigatório, até 40 letras e sem repetir na mesma pessoa', async () => {
  await assert.rejects(as(ANA, () => newList('   ')), /check/, 'nome em branco');
  await assert.rejects(as(ANA, () => newList('x'.repeat(41))), /check/, 'nome longo demais');
  await as(ANA, () => newList('Comédias'));
  await assert.rejects(as(ANA, () => newList('  COMÉDIAS ')), /duplicate|unique/, 'mesmo nome, outra caixa');
  await as(BIA, () => newList('Comédias')); // outra pessoa pode usar o mesmo nome
});

test('títulos: só nas próprias listas, uma vez por lista, em várias listas', async () => {
  const terror = await as(ANA, () => newList('Terror'));
  const sexta = await as(ANA, () => newList('Sexta à noite'));
  await as(ANA, () => addItem(terror, 694, 'O Iluminado'));
  await as(ANA, () => addItem(sexta, 694, 'O Iluminado'));
  await assert.rejects(as(ANA, () => addItem(terror, 694)), /duplicate|unique/, 'o mesmo título duas vezes na lista');

  await denied(as(BIA, () => addItem(terror, 550)), 'Bia não põe título na lista da Ana');
  assert.equal((await as(BIA, () => rows('SELECT * FROM user_list_items'))).length, 0, 'Bia não vê os títulos da Ana');
  await as(BIA, () => rows('DELETE FROM user_list_items WHERE list_id = $1', [terror]));
  assert.equal((await as(ANA, () => rows('SELECT * FROM user_list_items WHERE list_id = $1', [terror]))).length, 1, 'Bia não tira');

  await denied(as(ANA, () => rows(
    `INSERT INTO user_list_items (list_id, user_id, tmdb_id, media_type, title, poster_path) VALUES ($1, auth.uid(), 1, 'movie', 'X', $2)`,
    [terror, 'https://evil.dev/x.jpg'],
  )), 'pôster só do TMDB');

  await as(ANA, () => rows('DELETE FROM user_lists WHERE id = $1', [terror]));
  const left = await as(ANA, () => rows('SELECT list_id FROM user_list_items'));
  assert.deepEqual(left.map(r => r.list_id), [sexta], 'apagar a lista leva os títulos dela, não os das outras');
});

test('sem login não vê nem cria nada', async () => {
  await denied(as(null, () => rows('SELECT * FROM user_lists')));
  await denied(as(null, () => rows('SELECT * FROM user_list_items')));
});

test('limite de 50 listas por pessoa', async () => {
  const have = Number((await rows('SELECT count(*) FROM user_lists WHERE user_id = $1', [BIA]))[0].count);
  for (let i = have; i < 50; i++) await as(BIA, () => newList(`Lista ${i}`));
  await assert.rejects(as(BIA, () => newList('Uma a mais')), /limite de 50 listas/);
});

test('ordem: a pessoa reordena só as próprias listas', async () => {
  const lista = await as(ANA, () => newList('Ordem'));
  for (const id of [10, 20, 30]) await as(ANA, () => addItem(lista, id));
  await as(ANA, () => rows('SELECT reorder_list_items($1, $2)', [lista, [30, 10, 20]]));
  const order = async () => (await rows('SELECT tmdb_id FROM user_list_items WHERE list_id = $1 ORDER BY position', [lista])).map(r => r.tmdb_id);
  assert.deepEqual(await order(), [30, 10, 20]);

  await as(BIA, () => rows('SELECT reorder_list_items($1, $2)', [lista, [20, 30, 10]]));
  assert.deepEqual(await order(), [30, 10, 20], 'Bia não muda a ordem da lista da Ana');
  await denied(as(ANA, () => rows('UPDATE user_list_items SET title = $1 WHERE list_id = $2', ['Trocado', lista])), 'só a posição pode mudar');
  await denied(as(null, () => rows('SELECT reorder_list_items($1, $2)', [lista, [10]])), 'sem login não reordena');
});

test('link público: liga, abre sem login na ordem certa, desliga', async () => {
  const lista = await as(ANA, () => newList('Para a Bia'));
  for (const id of [1, 2, 3]) await as(ANA, () => addItem(lista, id, `Filme ${id}`));
  await as(ANA, () => rows('SELECT reorder_list_items($1, $2)', [lista, [3, 1, 2]]));

  const [{ set_list_sharing: none }] = await as(BIA, () => rows('SELECT set_list_sharing($1, true)', [lista]));
  assert.equal(none, null, 'Bia não liga o link da lista da Ana');
  const [{ set_list_sharing: token }] = await as(ANA, () => rows('SELECT set_list_sharing($1, true)', [lista]));
  assert.match(token, /^[0-9a-f-]{36}$/);
  const [{ set_list_sharing: same }] = await as(ANA, () => rows('SELECT set_list_sharing($1, true)', [lista]));
  assert.equal(same, token, 'ligar de novo mantém o mesmo link');

  const [{ get_shared_list: seen }] = await as(null, () => rows('SELECT get_shared_list($1)', [token]));
  assert.deepEqual(
    { name: seen.name, owner: seen.owner, mine: seen.is_mine, listId: seen.list_id, ids: seen.items.map(i => i.tmdb_id) },
    { name: 'Para a Bia', owner: 'Ana', mine: false, listId: null, ids: [3, 1, 2] },
    'sem login vê a lista, na ordem, com o nome (sem email) de quem fez',
  );
  assert.equal(JSON.stringify(seen).includes('ana@x.dev'), false);
  const [{ get_shared_list: own }] = await as(ANA, () => rows('SELECT get_shared_list($1)', [token]));
  assert.deepEqual({ mine: own.is_mine, listId: own.list_id }, { mine: true, listId: lista });

  const [{ get_shared_list: wrong }] = await as(null, () => rows('SELECT get_shared_list($1)', ['00000000-0000-4000-8000-000000000999']));
  assert.equal(wrong, null, 'token errado não acha nada');
  await denied(as(null, () => rows('SELECT share_token FROM user_lists')), 'sem login não lista os tokens');
  await denied(as(null, () => rows('SELECT set_list_sharing($1, true)', [lista])));

  await as(ANA, () => rows('SELECT set_list_sharing($1, false)', [lista]));
  const [{ get_shared_list: off }] = await as(null, () => rows('SELECT get_shared_list($1)', [token]));
  assert.equal(off, null, 'desligado, o link antigo para de funcionar');
});
