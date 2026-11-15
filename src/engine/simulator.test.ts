import { describe, expect, it } from 'vitest';
import { ENGINE_CONFIG, GAME_MODES, totalPoints } from '../config/gameConfig';
import { PLAYERS, getPlayer } from '../data/catalog';
import { filterBySpin, generateRivalTeam, spinRoulette } from './draft';
import { assignSlot, autoLineup, emptyLineup, validateLineup } from './lineup';
import { individualRating, pairRating } from './rating';
import { createRng, deriveRng } from './rng';
import { simulateCup, winProbability } from './simulator';

describe('rng', () => {
  it('is reproducible for equal seeds', () => {
    const a = createRng('abc');
    const b = createRng('abc');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(createRng('abd')()).not.toEqual(createRng('abc')());
  });
});

describe('rating', () => {
  it('keeps every player in 0-100 and ranks Tiger above an average player', () => {
    for (const p of PLAYERS) {
      const r = individualRating(p);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(100);
    }
    expect(individualRating(getPlayer('tiger-2000s'))).toBeGreaterThan(individualRating(getPlayer('bradley-2010s')));
  });

  it('applies the +3 chemistry bonus to historic foursomes pairs', () => {
    const seve = getPlayer('seve-1980s');
    const ola = getPlayer('olazabal-1990s');
    expect(pairRating(seve, ola, 'foursomes').chemistry).toBe(ENGINE_CONFIG.formats.foursomes.chemistryBonus);
  });
});

describe('winProbability', () => {
  it('gives ~72% for a 10-point edge with k=25 and is symmetric', () => {
    expect(winProbability(70, 60, 25)).toBeCloseTo(0.715, 2);
    expect(winProbability(60, 70, 25) + winProbability(70, 60, 25)).toBeCloseTo(1, 10);
    expect(winProbability(50, 50)).toBe(0.5);
  });
});

describe('draft', () => {
  it('always lands on a spin with available players', () => {
    const picked: string[] = [];
    for (let turn = 0; turn < 12; turn++) {
      const spin = spinRoulette(PLAYERS, 'EU', picked, deriveRng('t', `spin:${turn}`));
      const options = filterBySpin(PLAYERS, 'EU', spin.result, picked);
      expect(options.length).toBeGreaterThan(0);
      expect(spin.segments[spin.targetIndex]).toEqual(spin.result);
      picked.push(options[0].id);
    }
    expect(new Set(picked).size).toBe(12);
  });

  it('builds a rival team from the other side', () => {
    const rival = generateRivalTeam(PLAYERS, 'USA', 6, 'hard', createRng(1));
    expect(rival).toHaveLength(6);
    expect(rival.every((p) => p.bando === 'USA')).toBe(true);
  });
});

describe('lineup + cup simulation', () => {
  for (const mode of [GAME_MODES.quick, GAME_MODES.full]) {
    it(`simulates a complete ${mode.id} cup (${totalPoints(mode)} pts) reproducibly`, () => {
      const user = generateRivalTeam(PLAYERS, 'EU', mode.teamSize, 'normal', createRng('u'));
      const rival = generateRivalTeam(PLAYERS, 'USA', mode.teamSize, 'normal', createRng('r'));
      const userLineup = autoLineup(user, mode);
      const rivalLineup = autoLineup(rival, mode);
      expect(validateLineup(userLineup, mode, user.map((p) => p.id))).toEqual([]);
      const input = { mode, userSide: 'EU' as const, userLineup, rivalLineup, seed: 'seed42', resolve: getPlayer };
      const a = simulateCup(input);
      const b = simulateCup(input);
      expect(a).toEqual(b);
      expect(a.pointsUser + a.pointsRival).toBe(totalPoints(mode));
      expect(a.mvp).not.toBeNull();
      expect(a.bestPair).not.toBeNull();
    });
  }

  it('swaps players instead of duplicating them within a session', () => {
    const mode = GAME_MODES.quick;
    let l = emptyLineup(mode);
    l = assignSlot(l, 0, 0, 0, 'seve-1980s');
    l = assignSlot(l, 0, 0, 1, 'olazabal-1990s');
    l = assignSlot(l, 0, 1, 0, 'seve-1980s');
    expect(l[0][0][0]).toBeNull();
    expect(l[0][1][0]).toBe('seve-1980s');
  });

  it('makes a perfect score possible but rare between equal teams', () => {
    const mode = GAME_MODES.quick;
    const user = generateRivalTeam(PLAYERS, 'EU', 6, 'hard', createRng(3));
    const rival = generateRivalTeam(PLAYERS, 'USA', 6, 'hard', createRng(4));
    const userLineup = autoLineup(user, mode);
    const rivalLineup = autoLineup(rival, mode);
    let perfect = 0;
    for (let i = 0; i < 2000; i++) {
      const r = simulateCup({ mode, userSide: 'EU', userLineup, rivalLineup, seed: `s${i}`, resolve: getPlayer });
      if (r.perfect) perfect++;
    }
    expect(perfect).toBeLessThan(20);
  });
});
