import { describe, it, expect } from '@jest/globals';
import { battleSize, champion, choose, currentPair, isDone, progress, stageLabel, stageTrack, startBattle } from '../../src/domain/battle.js';

const items = n => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

describe('Cine-batalha', () => {
  it('uses 8 titles, or 4 when there are fewer, or none', () => {
    expect(battleSize(12)).toBe(8);
    expect(battleSize(7)).toBe(4);
    expect(battleSize(3)).toBe(0);
    expect(startBattle(items(3))).toBeNull();
    expect(startBattle(items(10)).round).toHaveLength(8);
  });

  it('runs quarterfinals, semifinal and final: 7 choices for 8 titles', () => {
    let b = startBattle(items(8));
    expect(currentPair(b).map(i => i.id)).toEqual([1, 2]);
    expect(stageLabel(b)).toBe('Quartas de final · duelo 1 de 4');
    expect(progress(b)).toEqual({ done: 0, total: 7 });

    // Sempre o da direita nas quartas: 2, 4, 6, 8
    for (let i = 0; i < 4; i++) b = choose(b, 1);
    expect(b.round.map(i => i.id)).toEqual([2, 4, 6, 8]);
    expect(stageLabel(b)).toBe('Semifinal · duelo 1 de 2');
    expect(progress(b)).toEqual({ done: 4, total: 7 });

    b = choose(b, 0); // 2
    b = choose(b, 1); // 8
    expect(stageLabel(b)).toBe('Final');
    expect(currentPair(b).map(i => i.id)).toEqual([2, 8]);
    expect(progress(b)).toEqual({ done: 6, total: 7 });

    b = choose(b, 1);
    expect(isDone(b)).toBe(true);
    expect(champion(b).id).toBe(8);
    expect(currentPair(b)).toBeNull();
    expect(choose(b, 0)).toBe(b);
  });

  it('a battle of 4 starts at the semifinal', () => {
    const b = startBattle(items(5));
    expect(stageLabel(b)).toBe('Semifinal · duelo 1 de 2');
    expect(progress(b).total).toBe(3);
  });

  it('ignores invalid choices', () => {
    const b = startBattle(items(8));
    expect(choose(b, 2)).toBe(b);
    expect(choose(null, 0)).toBeNull();
  });
});

describe('stageTrack', () => {
  it('shows every stage, with the duels done, the current one and the ones to come', () => {
    let b = startBattle(items(8));
    expect(stageTrack(b)).toEqual([
      { label: 'Quartas', duels: ['current', 'todo', 'todo', 'todo'] },
      { label: 'Semi', duels: ['todo', 'todo'] },
      { label: 'Final', duels: ['todo'] },
    ]);
    for (let i = 0; i < 3; i++) b = choose(b, 0);
    // "Quartas · duelo 4 de 4": três feitos e o quarto na tela
    expect(stageTrack(b)[0].duels).toEqual(['done', 'done', 'done', 'current']);
    b = choose(b, 0);
    expect(stageTrack(b).map(s => s.duels)).toEqual([['done', 'done', 'done', 'done'], ['current', 'todo'], ['todo']]);
    for (let i = 0; i < 3; i++) b = choose(b, 0);
    expect(stageTrack(b).flatMap(s => s.duels)).toEqual(Array(7).fill('done'));
  });

  it('a battle of 4 has only semifinal and final', () => {
    expect(stageTrack(startBattle(items(4))).map(s => s.label)).toEqual(['Semi', 'Final']);
  });
});
