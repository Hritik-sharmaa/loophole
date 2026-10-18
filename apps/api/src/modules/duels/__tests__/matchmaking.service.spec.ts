import { MatchmakingService, ratingBand } from '../matchmaking.service.js';

describe('ratingBand (FR-18)', () => {
  it.each([
    [0, 150],
    [14_999, 150],
    [15_000, 250],
    [29_999, 250],
    [30_000, 350],
    [60_000, 550],
  ])('after %i ms of waiting: ±%i', (waited, band) => {
    expect(ratingBand(1_000, 1_000 + waited)).toBe(band);
  });
});

describe('MatchmakingService', () => {
  let queue: MatchmakingService;
  beforeEach(() => {
    queue = new MatchmakingService();
  });

  const ids = (pair: ReturnType<MatchmakingService['takePair']>) =>
    pair?.map((p) => p.userId) ?? null;

  it('pairs close ratings straight away, in queue order', () => {
    expect(queue.join('a', 's1', 1200, 0)).toBe(1);
    expect(queue.takePair(0)).toBeNull();
    expect(queue.join('b', 's2', 1300, 0)).toBe(2); // 100 apart: within 150
    expect(queue.join('c', 's3', 1250, 0)).toBe(3);

    expect(ids(queue.takePair(0))).toEqual(['a', 'b']);
    expect(queue.takePair(0)).toBeNull();
  });

  it('a wide gap waits until the band has grown enough', () => {
    queue.join('a', 's1', 1200, 0);
    queue.join('b', 's2', 1400, 0); // 200 apart
    expect(queue.takePair(14_999)).toBeNull(); // ±150
    expect(ids(queue.takePair(15_000))).toEqual(['a', 'b']); // ±250
  });

  it('the longer wait decides the band', () => {
    queue.join('a', 's1', 1200, 0);
    // b has just joined (±150), but a has waited 45 s (±450): 400 apart fits.
    queue.join('b', 's2', 1600, 45_000);
    expect(ids(queue.takePair(45_000))).toEqual(['a', 'b']);
  });

  it('skips an outlier to pair compatible players', () => {
    queue.join('a', 's1', 1200, 0);
    queue.join('far', 's2', 1700, 0);
    queue.join('c', 's3', 1250, 0);
    expect(ids(queue.takePair(0))).toEqual(['a', 'c']);
    expect(queue.join('far', 's2', 1700, 0)).toBe(1); // still waiting, first
  });

  it('never pairs a player with themselves; a second tab keeps the wait', () => {
    queue.join('a', 'tab1', 1200, 0);
    expect(queue.join('a', 'tab2', 1200, 30_000)).toBe(1);
    expect(queue.takePair(30_000)).toBeNull();

    queue.join('b', 's2', 1500, 30_000); // 300 apart; a has waited 30 s: ±350
    expect(queue.takePair(30_000)).toEqual([
      { userId: 'a', socketId: 'tab2', elo: 1200, joinedAt: 0 },
      { userId: 'b', socketId: 's2', elo: 1500, joinedAt: 30_000 },
    ]);
  });

  it('leave and a closed socket remove the player', () => {
    queue.join('a', 's1', 1200, 0);
    queue.join('b', 's2', 1200, 0);
    queue.join('c', 's3', 1200, 0);
    queue.leave('a');
    queue.leaveSocket('s2');
    queue.join('d', 's4', 1200, 0);
    expect(ids(queue.takePair(0))).toEqual(['c', 'd']);
  });
});
