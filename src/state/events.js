// Avisos entre partes do app: quem muda algo avisa; quem desenha aquilo escuta.
// Assim a navegação, os modais e os dados não precisam conhecer cada tela que depende deles.
// As escutas rodam na hora, na ordem em que foram registradas; `await emit(...)` espera as
// que são assíncronas (ex.: a biblioteca terminar de desenhar antes de mover o foco).
//
//   'mode:changed'    { mode }  tela principal (discover, roulette, match, library)
//   'type:changed'    { type }  filme, série ou dorama
//   'tab:changed'     { tab }   aba da biblioteca
//   'filters:changed' {}        um filtro mudou (pela pessoa, por um link ou pelo código); valores em state.filters
//   'providers:changed' { select }  as opções de "Minhas plataformas" mudaram; select: passar a filtrar por elas
//   'providers:choose' {}       a pessoa tocou em "Escolher/Editar minhas plataformas" no filtro
//   'library:changed' {}        quero ver, vistos, episódios, reações ou listas mudaram
//   'title:opened'    { item, mediaType }  a página de um título abriu (ou trocou de título)
//   'title:closed'    {}        a página do título fechou
//   'profile:opened'  {}        o perfil abriu
//   'progress:changed' {}       XP, sequência ou desafios mudaram
//   'session:started' { kind }  alguém entrou ('account' ou 'guest'), com os dados já carregados
//   'session:ended'   { kind }  saiu (ou apagou a conta); a sessão já está vazia
const handlers = new Map();

// Uma escuta com erro não impede as outras nem quebra quem avisou: o erro só vai para o console
export function emit(name, detail = {}) {
  const results = [...(handlers.get(name) || [])].map(handler => {
    try {
      return Promise.resolve(handler(detail)).catch(error => console.error(`Erro ao tratar "${name}":`, error));
    } catch (error) {
      console.error(`Erro ao tratar "${name}":`, error);
      return undefined;
    }
  });
  return Promise.all(results);
}

export function on(name, handler) {
  if (!handlers.has(name)) handlers.set(name, new Set());
  handlers.get(name).add(handler);
  return () => handlers.get(name).delete(handler);
}
