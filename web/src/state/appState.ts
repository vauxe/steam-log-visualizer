import type { Filters, Session } from '@types';

import { clearAggCache } from './aggregatorCall';

export type FilterKey = keyof Filters;

const state: { sessions: Session[]; filter: Filters } = {
  sessions: [],
  filter: {
    account: '',
    gameQuery: '',
    // Global selection (top)
    appidSelected: '',
    date: '',
    dow: null,
    hour: null,
    year: '',
    // Per-game (bottom) independent filters
    accountGame: '',
    appidGame: '',
    yearGame: '',
    appidsIncluded: [],
  },
};

function resetDerived() {
  clearAggCache();
}

export const AppState = {
  setSessions(s: Session[]) {
    state.sessions = s;
    resetDerived();
  },
  getSessions() {
    return state.sessions;
  },
  setFilter<K extends FilterKey>(key: K, value: Filters[K]) {
    (state.filter as any)[key] = value;
  },
  getFilter<K extends FilterKey>(key: K) {
    return state.filter[key];
  },
  getFilters(): Filters {
    return state.filter;
  },
};

export function getFilteredSessions(): Session[] {
  const fmt = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const f = state.filter;
  return state.sessions.filter(
    (s) =>
      (!f.account || s.account_id === f.account) &&
      (!f.gameQuery ||
        (s.app_name && s.app_name.toLowerCase().includes(f.gameQuery)) ||
        s.appid.includes(f.gameQuery)) &&
      (!f.date || fmt(s.start) === f.date) &&
      (f.dow == null || s.start.getDay() === f.dow) &&
      (f.hour == null || s.start.getHours() === f.hour) &&
      (!f.year || s.start.getFullYear() === f.year) &&
      (!(f.appidsIncluded && f.appidsIncluded.length) || f.appidsIncluded.includes(s.appid))
  );
}
