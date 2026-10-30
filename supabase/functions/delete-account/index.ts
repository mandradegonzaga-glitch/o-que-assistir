// Apaga a conta de quem chamou. Só o servidor pode remover de auth.users (exige a chave service_role,
// que nunca vai para o navegador); o ON DELETE CASCADE do schema leva perfil e demais tabelas junto.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*', // a autorização vem do token do usuário, não da origem
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return reply(401, { error: 'unauthorized' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // O id vem do token validado, nunca do corpo: ninguém apaga a conta de outra pessoa
  const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !user) return reply(401, { error: 'unauthorized' });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('Falha ao apagar conta:', error.message);
    return reply(500, { error: 'delete_failed' });
  }

  return reply(200, { deleted: true });
});
