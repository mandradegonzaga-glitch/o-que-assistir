import { describe, it, expect } from '@jest/globals';
import { createLiveState, liveReduce, makeRoomCode, normalizeRoomCode, parseLiveMessage, ROOM_ALPHABET } from '../../src/domain/liveMatch.js';

const HOST = 'host-0000-aaaa';
const GUEST = 'guest-000-bbbb';
const OTHER = 'other-000-cccc';
const sends = actions => actions.filter(a => a.send).map(a => a.send);

// Entrega as mensagens de um lado para o outro, como o canal faria
function play(steps) {
  let host = createLiveState('host', HOST);
  let guest = createLiveState('guest', GUEST);
  const log = { host: [], guest: [] };
  const run = (who, msg) => {
    const side = who === 'host' ? host : guest;
    const { state, actions } = liveReduce(side, msg);
    if (who === 'host') host = state; else guest = state;
    log[who].push(...actions);
    return actions;
  };
  steps({ run, get host() { return host; }, get guest() { return guest; } });
  return { host, guest, log };
}

describe('código da sala', () => {
  it('tem 6 letras do alfabeto sem caracteres ambíguos', () => {
    const code = makeRoomCode();
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(ROOM_ALPHABET).not.toMatch(/[01OIL]/);
    expect(normalizeRoomCode(code)).toBe(code);
  });

  it('aceita o código digitado com minúsculas, espaços e traços', () => {
    expect(normalizeRoomCode(' ab-c 23x ')).toBe('ABC23X');
  });

  it('recusa código com tamanho errado ou caractere ambíguo', () => {
    expect(normalizeRoomCode('ABC')).toBeNull();
    expect(normalizeRoomCode('ABC1OX')).toBeNull();
    expect(normalizeRoomCode(null)).toBeNull();
  });
});

describe('parseLiveMessage', () => {
  it('confere quem mandou e cada campo', () => {
    expect(parseLiveMessage({ event: 'hello', from: GUEST, name: ' Bia ' }, 12)).toEqual({ event: 'hello', from: GUEST, name: 'Bia' });
    expect(parseLiveMessage({ event: 'hello', from: 'x', name: 'Bia' }, 12)).toBeNull();
    expect(parseLiveMessage({ event: 'hello', from: GUEST, name: 'a'.repeat(21) }, 12)).toBeNull();
    expect(parseLiveMessage({ event: 'progress', from: GUEST, index: 13 }, 12)).toBeNull();
    expect(parseLiveMessage({ event: 'nada', from: GUEST }, 12)).toBeNull();
    expect(parseLiveMessage('texto', 12)).toBeNull();
  });

  it('start traz tipo, ids e os dois nomes válidos', () => {
    const start = { event: 'start', from: HOST, to: GUEST, type: 'movie', ids: [1, 2, 3], names: ['Ana', 'Bia'] };
    expect(parseLiveMessage(start, 0)).toEqual(start);
    expect(parseLiveMessage({ ...start, type: 'anime' }, 0)).toBeNull();
    expect(parseLiveMessage({ ...start, ids: [1] }, 0)).toBeNull();
    expect(parseLiveMessage({ ...start, ids: [1, -2] }, 0)).toBeNull();
    expect(parseLiveMessage({ ...start, names: ['Ana'] }, 0)).toBeNull();
  });

  it('votos: índices únicos dentro da lista', () => {
    expect(parseLiveMessage({ event: 'votes', from: HOST, votes: [0, 2] }, 3)).toEqual({ event: 'votes', from: HOST, votes: [0, 2] });
    expect(parseLiveMessage({ event: 'votes', from: HOST, votes: [3] }, 3)).toBeNull();
    expect(parseLiveMessage({ event: 'votes', from: HOST, votes: [1, 1] }, 3)).toBeNull();
    expect(parseLiveMessage({ event: 'votes', from: HOST, votes: '1' }, 3)).toBeNull();
  });
});

describe('liveReduce', () => {
  const hello = { event: 'hello', from: GUEST, name: 'Bia' };
  const start = { event: 'start', from: HOST, to: GUEST, type: 'movie', ids: [1, 2], names: ['Ana', 'Bia'] };

  it('a primeira pessoa que chega começa o jogo; a terceira recebe "cheio"', () => {
    play(s => { const { run } = s;
      expect(run('host', hello)).toEqual(['partner-joined', { send: 'start', to: GUEST }]);
      expect(s.host.partnerId).toBe(GUEST);
      expect(run('host', { event: 'hello', from: OTHER, name: 'Cau' })).toEqual([{ send: 'full', to: OTHER }]);
      // O mesmo aparelho pedindo de novo recebe o início de novo, sem novo aviso
      expect(run('host', hello)).toEqual([{ send: 'start', to: GUEST }]);
    });
  });

  it('quem entra só aceita o início endereçado a ele, uma vez', () => {
    play(s => { const { run } = s;
      expect(run('guest', { ...start, to: OTHER })).toEqual([]);
      expect(run('guest', start)).toEqual(['start']);
      expect(s.guest.partnerName).toBe('Ana');
      expect(run('guest', start)).toEqual([]);
    });
  });

  it('"cheio" só vale para quem ainda não entrou', () => {
    play(({ run }) => {
      expect(run('guest', { event: 'full', from: HOST, to: GUEST })).toEqual(['full']);
      run('guest', start);
      expect(run('guest', { event: 'full', from: HOST, to: GUEST })).toEqual([]);
    });
  });

  it('ignora mensagens de quem não é o par', () => {
    play(s => { const { run } = s;
      run('host', hello);
      expect(run('host', { event: 'votes', from: OTHER, votes: [0] })).toEqual([]);
      expect(run('host', { event: 'progress', from: OTHER, index: 2 })).toEqual([]);
      expect(s.host.partnerVotes).toBeNull();
    });
  });

  it('votos só saem depois que as duas pessoas terminaram', () => {
    const { log } = play(({ run }) => {
      run('host', hello);
      run('guest', start);
      // A anfitriã termina primeiro: avisa que terminou, mas não manda votos
      expect(sends(run('host', { event: 'self-done' }))).toEqual(['done']);
      expect(run('guest', { event: 'done', from: HOST })).toEqual(['progress']);
      // Quem entrou termina: agora sim manda os votos
      expect(sends(run('guest', { event: 'self-done' }))).toEqual(['done', 'votes']);
      // A anfitriã recebe "terminei" e os votos: manda os dela e mostra o resultado
      expect(sends(run('host', { event: 'done', from: GUEST }))).toEqual(['votes']);
      expect(run('host', { event: 'votes', from: GUEST, votes: [1] })).toEqual(['finish']);
      expect(run('guest', { event: 'votes', from: HOST, votes: [0, 1] })).toEqual(['finish']);
    });
    expect(log.host.filter(a => a === 'finish')).toHaveLength(1);
  });

  it('as duas terminando ao mesmo tempo também chegam ao resultado', () => {
    const { host, guest } = play(({ run }) => {
      run('host', hello);
      run('guest', start);
      run('host', { event: 'self-done' });
      run('guest', { event: 'self-done' });
      run('host', { event: 'done', from: GUEST });
      run('guest', { event: 'done', from: HOST });
      run('host', { event: 'votes', from: GUEST, votes: [] });
      run('guest', { event: 'votes', from: HOST, votes: [0] });
    });
    expect([host.finished, guest.finished]).toEqual([true, true]);
  });

  it('votos que chegam antes do "terminei" também respondem e encerram', () => {
    play(({ run }) => {
      run('host', hello);
      run('host', { event: 'self-done' });
      expect(run('host', { event: 'votes', from: GUEST, votes: [0] })).toEqual([{ send: 'votes' }, 'finish']);
    });
  });

  it('progresso nunca volta para trás', () => {
    play(s => { const { run } = s;
      run('host', hello);
      run('host', { event: 'progress', from: GUEST, index: 5 });
      run('host', { event: 'progress', from: GUEST, index: 3 });
      expect(s.host.partnerProgress).toBe(5);
    });
  });

  it('saída do par antes do fim avisa; depois do resultado, não', () => {
    play(({ run }) => {
      run('host', hello);
      expect(run('host', { event: 'bye', from: GUEST })).toEqual(['partner-left']);
    });
    play(({ run }) => {
      run('host', hello);
      run('host', { event: 'self-done' });
      run('host', { event: 'votes', from: GUEST, votes: [] });
      expect(run('host', { event: 'bye', from: GUEST })).toEqual([]);
    });
  });
});
