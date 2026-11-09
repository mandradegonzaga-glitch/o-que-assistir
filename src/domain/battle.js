// Cine-batalha: mata-mata entre títulos, de dois em dois, até sobrar um. Lógica pura e imutável.
const BATTLE_SIZES = [8, 4]; // com menos de 8 bons títulos, uma batalha de 4

export function battleSize(available) {
  return BATTLE_SIZES.find(size => available >= size) || 0;
}

export function startBattle(items) {
  const size = battleSize(items.length);
  if (!size) return null;
  return { round: items.slice(0, size), winners: [], index: 0, size };
}

// Dupla da vez: [a, b]
export function currentPair(battle) {
  if (!battle || isDone(battle)) return null;
  return [battle.round[battle.index], battle.round[battle.index + 1]];
}

export function choose(battle, side) {
  const pair = currentPair(battle);
  if (!pair || (side !== 0 && side !== 1)) return battle;
  const winners = [...battle.winners, pair[side]];
  const index = battle.index + 2;
  if (index < battle.round.length) return { ...battle, winners, index };
  return { ...battle, round: winners, winners: [], index: 0 }; // rodada acabou: os vencedores se enfrentam
}

export const isDone = battle => Boolean(battle) && battle.round.length === 1;
export const champion = battle => (isDone(battle) ? battle.round[0] : null);

const STAGE_NAMES = { 8: 'Quartas de final', 4: 'Semifinal', 2: 'Final' };
const STAGE_SHORT = { 8: 'Quartas', 4: 'Semi', 2: 'Final' };

// "Quartas de final · duelo 2 de 4", "Semifinal · duelo 1 de 2", "Final"
export function stageLabel(battle) {
  const n = battle.round.length;
  const name = STAGE_NAMES[n] || `Rodada de ${n}`;
  return n === 2 ? name : `${name} · duelo ${battle.index / 2 + 1} de ${n / 2}`;
}

// Trilha por fase: [{ label: 'Quartas', duels: ['done', 'done', 'current', 'todo'] }, ...]
// "done" = já votado; "current" = a dupla na tela; "todo" = ainda vem
export function stageTrack(battle) {
  const { done } = progress(battle);
  const finished = isDone(battle);
  const track = [];
  let duel = 0;
  for (let n = battle.size; n >= 2; n /= 2) {
    const duels = [];
    for (let i = 0; i < n / 2; i++, duel++) {
      duels.push(duel < done ? 'done' : duel === done && !finished ? 'current' : 'todo');
    }
    track.push({ label: STAGE_SHORT[n] || `${n}`, duels });
  }
  return track;
}

// Quantos duelos já foram e quantos são ao todo (7 numa batalha de 8)
export function progress(battle) {
  const total = battle.size - 1;
  let done = 0;
  for (let n = battle.size; n > battle.round.length; n /= 2) done += n / 2;
  return { done: done + battle.index / 2, total };
}
