import type { AggregatorClient } from './aggregatorClient';
import { sessionsHash } from './hash';
import type { Filters } from '../types';
import type { AggMethod } from '../types/worker';

// Simple in-memory cache shared across calls
const cache = new Map<string, any>();

export function makeAggKey(method: AggMethod, payload: any, sessions: any[], filters: Filters) {
  const base = {
    method,
    payload: { ...payload, sessions: undefined },
    filters,
    n: sessions?.length || 0,
    sh: sessionsHash(sessions || []),
  };
  return JSON.stringify(base);
}

export async function aggregatorCall<T = any>(
  client: AggregatorClient,
  method: AggMethod,
  payload: any,
  sessions: any[],
  filters: Filters
): Promise<T> {
  const key = makeAggKey(method, payload, sessions, filters);
  if (cache.has(key)) return cache.get(key);
  const p = client.call(method, payload) as Promise<T>;
  cache.set(key, p);
  const res = await p;
  cache.set(key, res);
  return res;
}

export function clearAggCache() {
  cache.clear();
}
