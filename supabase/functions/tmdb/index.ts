// Proxy do TMDB: o navegador nunca vê a chave, que fica no segredo TMDB_API_KEY.
// Sem login porque o app também funciona para convidados; só repassa leituras das rotas que o app usa.
const ALLOWED_ORIGINS = new Set([
  'https://o-que-assistir-watch.vercel.app',
  'http://localhost:5173',
  'http://localhost:5175',
  'http://localhost:5176',
]);

const ALLOWED_PATHS = [
  /^\/search\/(movie|tv|person)$/,
  /^\/discover\/(movie|tv)$/,
  /^\/watch\/providers\/(movie|tv)$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/(movie|tv)\/\d+\/(credits|videos|external_ids|recommendations|similar|watch\/providers)$/,
  /^\/tv\/\d+\/season\/\d+$/,
];

const CACHE_SECONDS = 300;

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors: Record<string, string> = origin && ALLOWED_ORIGINS.has(origin)
    ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
    : {};

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors });

  // Chamadas de outros sites são recusadas; sem Origin (mesma aba, curl) só leem o que já é público
  if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response('Forbidden', { status: 403 });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/tmdb/, '');
  if (!ALLOWED_PATHS.some(pattern => pattern.test(path))) {
    return new Response('Not found', { status: 404, headers: cors });
  }

  const target = new URL(`https://api.themoviedb.org/3${path}${url.search}`);
  target.searchParams.set('api_key', Deno.env.get('TMDB_API_KEY') ?? '');

  try {
    const response = await fetch(target);
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Cache-Control': response.ok ? `public, max-age=${CACHE_SECONDS}` : 'no-store',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'upstream_failed' }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
