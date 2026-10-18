import { MatchmakingService } from '../matchmaking.service.js';

describe('MatchmakingService (FR-17)', () => {
  let queue: MatchmakingService;
  beforeEach(() => {
    queue = new MatchmakingService();
  });

  it('pairs the first two in line, in order', () => {
    expect(queue.join('a', 's1')).toBe(1);
    expect(queue.takePair()).toBeNull();
    expect(queue.join('b', 's2')).toBe(2);
    expect(queue.join('c', 's3')).toBe(3);

    expect(queue.takePair()?.map((p) => p.userId)).toEqual(['a', 'b']);
    expect(queue.takePair()).toBeNull();
    expect(queue.join('d', 's4')).toBe(2);
    expect(queue.takePair()?.map((p) => p.userId)).toEqual(['c', 'd']);
  });

  it('never pairs a player with themselves (a second tab replaces the first)', () => {
    queue.join('a', 'tab1');
    expect(queue.join('a', 'tab2')).toBe(1);
    expect(queue.takePair()).toBeNull();

    queue.join('b', 's2');
    expect(queue.takePair()).toEqual([
      { userId: 'a', socketId: 'tab2' },
      { userId: 'b', socketId: 's2' },
    ]);
  });

  it('leave and a closed socket remove the player', () => {
    queue.join('a', 's1');
    queue.join('b', 's2');
    queue.join('c', 's3');
    queue.leave('a');
    queue.leaveSocket('s2');
    queue.join('d', 's4');

    expect(queue.takePair()?.map((p) => p.userId)).toEqual(['c', 'd']);
  });
});
