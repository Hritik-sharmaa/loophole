'use client';

import type {
  DuelEnd,
  DuelMatched,
  DuelProgress,
  DuelStart,
  DuelSubmissionResult,
  QueueJoined,
  SocketError,
} from '@loophole/shared';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { connectDuels } from './socket';

type Score = { testsPassed: number; totalTests: number };

export type DuelState = {
  // offline: could not connect (or the token was refused).
  phase: 'connecting' | 'idle' | 'queued' | 'playing' | 'ended' | 'offline';
  position: number | null;
  duelId: string | null;
  opponent: DuelMatched['opponent'] | null;
  problem: DuelStart['problem'] | null;
  endsAt: string | null;
  mine: Score | null;
  theirs: Score | null;
  lastResult: DuelSubmissionResult | null;
  end: DuelEnd | null;
  submitting: boolean;
  error: SocketError | null;
};

const INITIAL: DuelState = {
  phase: 'connecting',
  position: null,
  duelId: null,
  opponent: null,
  problem: null,
  endsAt: null,
  mine: null,
  theirs: null,
  lastResult: null,
  end: null,
  submitting: false,
  error: null,
};

type Action =
  | { type: 'connected' }
  | { type: 'offline'; error: SocketError }
  | { type: 'queued'; position: number }
  | { type: 'left-queue' }
  | { type: 'matched'; data: DuelMatched }
  | { type: 'start'; data: DuelStart }
  | { type: 'progress'; data: DuelProgress; mine: boolean }
  | { type: 'result'; data: DuelSubmissionResult }
  | { type: 'end'; data: DuelEnd }
  | { type: 'submitting' }
  | { type: 'error'; error: SocketError }
  | { type: 'reset' };

function reduce(state: DuelState, action: Action): DuelState {
  switch (action.type) {
    case 'connected':
      // A resumed duel arrives as duel:start right after; keep it.
      return state.phase === 'connecting' || state.phase === 'offline'
        ? { ...state, phase: 'idle', error: null }
        : state;
    case 'offline':
      return { ...state, phase: 'offline', error: action.error };
    case 'queued':
      return {
        ...state,
        phase: 'queued',
        position: action.position,
        error: null,
      };
    case 'left-queue':
      return { ...state, phase: 'idle', position: null };
    case 'matched':
      return {
        ...state,
        duelId: action.data.duelId,
        opponent: action.data.opponent,
      };
    case 'start':
      return {
        ...INITIAL,
        phase: 'playing',
        duelId: action.data.duelId,
        opponent: state.opponent,
        problem: action.data.problem,
        endsAt: action.data.endsAt,
      };
    case 'progress': {
      const score = {
        testsPassed: action.data.testsPassed,
        totalTests: action.data.totalTests,
      };
      return action.mine
        ? { ...state, mine: score }
        : { ...state, theirs: score };
    }
    case 'result':
      return { ...state, lastResult: action.data, submitting: false };
    case 'end':
      return { ...state, phase: 'ended', end: action.data, submitting: false };
    case 'submitting':
      return { ...state, submitting: true, error: null };
    case 'error':
      return {
        ...state,
        // An error while queued (e.g. the duel could not start) means the
        // server no longer has us in line: back to "Find a duel".
        phase: state.phase === 'queued' ? 'idle' : state.phase,
        position: state.phase === 'queued' ? null : state.position,
        submitting: false,
        error: action.error,
      };
    case 'reset':
      return { ...INITIAL, phase: 'idle' };
  }
}

// One live duel connection for the signed-in user (myId), opened while
// `enabled`. The server decides everything; this only mirrors its events.
export function useDuelSocket(myId: string | null, enabled: boolean) {
  const [state, dispatch] = useReducer(reduce, INITIAL);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !myId) return;
    const socket = connectDuels();
    socketRef.current = socket;

    socket.on('connect', () => dispatch({ type: 'connected' }));
    socket.on('connect_error', (err: Error & { data?: SocketError }) =>
      dispatch({
        type: 'offline',
        error: err.data ?? {
          code: 'OFFLINE',
          message: 'Could not reach the duel server. Retrying…',
        },
      }),
    );
    socket.on('queue:joined', (d: QueueJoined) =>
      dispatch({ type: 'queued', position: d.position }),
    );
    socket.on('duel:matched', (d: DuelMatched) =>
      dispatch({ type: 'matched', data: d }),
    );
    socket.on('duel:start', (d: DuelStart) =>
      dispatch({ type: 'start', data: d }),
    );
    socket.on('duel:progress', (d: DuelProgress) =>
      dispatch({ type: 'progress', data: d, mine: d.userId === myId }),
    );
    socket.on('duel:result', (d: DuelSubmissionResult) =>
      dispatch({ type: 'result', data: d }),
    );
    socket.on('duel:end', (d: DuelEnd) => dispatch({ type: 'end', data: d }));
    socket.on('error', (e: SocketError) =>
      dispatch({ type: 'error', error: e }),
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, myId]);

  const findDuel = useCallback(() => {
    dispatch({ type: 'reset' });
    socketRef.current?.emit('queue:join');
  }, []);
  const leaveQueue = useCallback(() => {
    socketRef.current?.emit('queue:leave');
    dispatch({ type: 'left-queue' });
  }, []);
  const submit = useCallback(
    (code: string) => {
      if (!state.duelId) return;
      dispatch({ type: 'submitting' });
      socketRef.current?.emit('duel:submit', { duelId: state.duelId, code });
    },
    [state.duelId],
  );
  const forfeit = useCallback(() => {
    if (state.duelId)
      socketRef.current?.emit('duel:forfeit', { duelId: state.duelId });
  }, [state.duelId]);

  return { state, findDuel, leaveQueue, submit, forfeit };
}
