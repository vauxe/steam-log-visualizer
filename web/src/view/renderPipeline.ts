import {
  init as echartsInit,
  use as echartsUse,
  getInstanceByDom as getECByDom,
} from 'echarts/core';
import { BarChart as ECBarChart } from 'echarts/charts';
import {
  GridComponent as ECGridComponent,
  TooltipComponent as ECTooltipComponent,
} from 'echarts/components';
import { CanvasRenderer as ECCanvasRenderer } from 'echarts/renderers';
import { fmtDur, sum, escapeHtml } from '@utils/format';
import { renderCalendarHeatmapTS } from '@charts/calendar';
import { renderGameBarTS } from '@charts/gameBar';
import { renderGamePieTS } from '@charts/gamePie';
import { renderMonthChartTS } from '@charts/summary';
import { AppState, getFilteredSessions } from '@state/appState';
import type { AggregatorClient } from '@state/aggregatorClient';
import { makeAggregator } from '@state/aggregatorBound';
import { createBarOption } from '@charts/options';
import type { Filters, Session } from '@types';

echartsUse([ECBarChart, ECGridComponent, ECTooltipComponent, ECCanvasRenderer]);

interface GameGroup {
  appid: string;
  name: string;
  sessions: Session[];
  totalSeconds: number;
}

const ALL_YEARS_LABEL = () => {
  const i18n: any = (window as any).i18n;
  return i18n?.t?.('allYears') || 'All years';
};

export function getAvailableYearsFromSessions(sessions: Session[]): number[] {
  const years = new Set<number>();
  sessions.forEach((session) => {
    const year = session.start?.getFullYear?.();
    if (typeof year === 'number' && !Number.isNaN(year)) years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
}

function groupByGame(sessions: Session[]): GameGroup[] {
  const byGame = new Map<string, GameGroup>();
  sessions.forEach((session) => {
    const entry = byGame.get(session.appid);
    if (!entry) {
      byGame.set(session.appid, {
        appid: session.appid,
        name: session.app_name || session.appid,
        sessions: [session],
        totalSeconds: session.duration || 0,
      });
    } else {
      entry.sessions.push(session);
      entry.totalSeconds += session.duration || 0;
    }
  });
  return Array.from(byGame.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
}

function renderTextSummary(i18n: any, sessions: Session[], groups: GameGroup[]) {
  const totalSeconds = sum(sessions.map((s) => s.duration || 0));
  const accountsCount = new Set(sessions.map((s) => s.account_id)).size;
  const setText = (id: string, value: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('statSessions', sessions.length.toLocaleString());
  setText('statDuration', fmtDur(totalSeconds));
  setText('statAccounts', accountsCount.toString());
  setText('statGames', groups.length.toString());
}

function showLoading(inProgress: boolean) {
  const section = document.getElementById('sectionB');
  if (!section) return;
  let mask = document.getElementById('loadingMask') as HTMLElement | null;
  if (inProgress) {
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'loadingMask';
      mask.className = 'loading-mask';
      const i18n: any = (window as any).i18n;
      const label = escapeHtml(i18n?.t?.('processingSessions') || 'Processing...');
      mask.innerHTML = `<div class="loading-row"><span class="spinner"></span><span>${label}</span></div>`;
      section.prepend(mask);
    }
  } else if (mask) {
    mask.remove();
  }
}

function updateLabelWithYear(id: string, year: number | '', fallback: string) {
  const el = document.getElementById(id) as HTMLElement | null;
  if (!el) return;
  const memo = (el.dataset.base || el.textContent || '').trim();
  if (!el.dataset.base) el.dataset.base = memo;
  const suffix = year ? String(year) : fallback;
  el.textContent = `${el.dataset.base || memo} (${suffix})`;
}

function setSelectValue(id: string, value: string) {
  const el = document.getElementById(id) as HTMLSelectElement | null;
  if (el) el.value = value;
}

function syncPerGameFilters(appid: string, year: number, account: string) {
  AppState.setFilter('appidGame', appid || '');
  AppState.setFilter('yearGame', year || '');
  AppState.setFilter('accountGame', account || '');
  setSelectValue('gameSelect', appid || '');
  setSelectValue('gameYearFilter', year ? String(year) : '');
  setSelectValue('gameAccountFilter', account || '');
}

async function computeAllAggregations(
  client: AggregatorClient | null,
  sessions: Session[],
  year: number | null
): Promise<{ months: number[]; yearData: [string, number][] }> {
  if (!client || !sessions.length || !year) return { months: [], yearData: [] };
  const aggregator = makeAggregator(client, () => ({ sessions, filters: AppState.getFilters() }));
  const [monthAgg, dayAgg] = await Promise.all([
    aggregator('month', { sessions, opts: { fillYear: year } }),
    aggregator('day', { sessions, opts: { fillYear: year } }),
  ]);
  return {
    months: monthAgg?.values || [],
    yearData: dayAgg?.yearData || [],
  };
}

function pickTopGameForContext(allSessions: Session[], year: number | null, account: string) {
  if (!year) return '';
  const filtered = allSessions.filter((session) => {
    if (account && session.account_id !== account) return false;
    return session.start?.getFullYear?.() === year;
  });
  const totals = new Map<string, number>();
  filtered.forEach((session) => {
    totals.set(session.appid, (totals.get(session.appid) || 0) + (session.duration || 0));
  });
  let best: string = '';
  let bestValue = 0;
  totals.forEach((value, key) => {
    if (value > bestValue) {
      bestValue = value;
      best = key;
    }
  });
  return best;
}

let lastGlobalContext: { year: number | ''; account: string } = { year: '', account: '' };

export async function renderApp(
  i18n: any,
  aggregatorClient: AggregatorClient | null,
  onRender?: () => void
) {
  const sessions = getFilteredSessions();
  const groups = groupByGame(sessions);

  let months: number[] = [];
  let yearData: [string, number][] = [];
  const globalYearRaw = AppState.getFilter('year') as number | '';
  const selectedYear =
    typeof globalYearRaw === 'number' && globalYearRaw > 0 ? globalYearRaw : null;
  if (sessions.length && selectedYear) {
    showLoading(true);
    try {
      const agg = await computeAllAggregations(aggregatorClient, sessions, selectedYear);
      months = agg.months || [];
      yearData = agg.yearData || [];
    } finally {
      showLoading(false);
    }
  } else {
    showLoading(false);
  }

  renderTextSummary(i18n, sessions, groups);

  const globalAccount = (AppState.getFilter('account') as string) || '';
  const perGameYearRaw = AppState.getFilter('yearGame') as number | '';

  const handlePrimaryGameSelect = (appid: string) => {
    const currentYear =
      typeof globalYearRaw === 'number' && globalYearRaw > 0
        ? globalYearRaw
        : typeof perGameYearRaw === 'number' && perGameYearRaw > 0
          ? perGameYearRaw
          : null;
    if (!currentYear || !appid) return;
    syncPerGameFilters(appid, currentYear, globalAccount);
    if (onRender) onRender();
  };

  renderGameBarTS(groups, handlePrimaryGameSelect);
  renderGamePieTS(groups, handlePrimaryGameSelect);
  updateLabelWithYear('lblMonthChart', selectedYear ?? '', ALL_YEARS_LABEL());
  renderMonthChartTS(selectedYear ? months : null);

  updateLabelWithYear('lblDailyHeatmap', selectedYear ?? '', ALL_YEARS_LABEL());
  const calendarTarget = document.getElementById('calendarYear');
  const calendarData: [string, number][] = selectedYear ? yearData : [];
  renderCalendarHeatmapTS(calendarTarget, selectedYear, calendarData);

  const allSessions = AppState.getSessions();
  const availableYears = getAvailableYearsFromSessions(allSessions);
  const yearForGameContext =
    typeof globalYearRaw === 'number' && globalYearRaw > 0
      ? globalYearRaw
      : typeof perGameYearRaw === 'number' && perGameYearRaw > 0
        ? perGameYearRaw
        : availableYears[0] || null;
  const topGame = pickTopGameForContext(allSessions, yearForGameContext, globalAccount);
  const currentGame = (AppState.getFilter('appidGame') as string) || '';
  const contextChanged =
    globalYearRaw !== lastGlobalContext.year || globalAccount !== lastGlobalContext.account;

  if (yearForGameContext && ((contextChanged && topGame) || (!currentGame && topGame))) {
    syncPerGameFilters(topGame, yearForGameContext, globalAccount);
  }

  lastGlobalContext = { year: globalYearRaw, account: globalAccount };

  await renderGameDetails(i18n, aggregatorClient);
}

async function computeGameAggregations(
  client: AggregatorClient | null,
  sessions: Session[],
  appid: string,
  year: number
): Promise<{ months: number[]; yearData: [string, number][] }> {
  if (!client || !appid || !year) return { months: [], yearData: [] };
  const scopedSessions = sessions.filter((session) => session.appid === appid);
  const aggregator = makeAggregator(client, () => ({
    sessions: scopedSessions,
    filters: AppState.getFilters(),
  }));
  const [monthAgg, dayAgg] = await Promise.all([
    aggregator('month', { sessions: scopedSessions, opts: { fillYear: year } }),
    aggregator('day', { sessions: scopedSessions, opts: { fillYear: year } }),
  ]);
  return {
    months: monthAgg?.values || [],
    yearData: dayAgg?.yearData || [],
  };
}

function renderBarInto(el: HTMLElement | null, labels: string[], values: number[]) {
  if (!el) return;
  if (el.clientWidth === 0 || el.clientHeight === 0) return;
  const chart = (getECByDom(el) as any) || echartsInit(el, null, { renderer: 'canvas' });
  if (!labels.length || !values.length) {
    chart.clear();
    return;
  }
  chart.setOption(createBarOption(labels, values) as any);
}

async function renderGameDetails(i18n: any, client: AggregatorClient | null) {
  const appid = (AppState.getFilter('appidGame') as string) || '';
  const accountGame = (AppState.getFilter('accountGame') as string) || '';
  const summaryEl = document.getElementById('gameSummaryText');
  const monthChartEl = document.getElementById('gameMonthChart');
  const heatmapEl = document.getElementById('gameCalendarYear');

  if (!appid) {
    if (summaryEl) summaryEl.textContent = '';
    if (monthChartEl) {
      (getECByDom(monthChartEl as HTMLElement) as any)?.dispose?.();
      monthChartEl.innerHTML = '';
    }
    if (heatmapEl) {
      (getECByDom(heatmapEl as HTMLElement) as any)?.dispose?.();
      heatmapEl.innerHTML = '';
    }
    return;
  }

  const sessionsAll = AppState.getSessions();
  const scopedSessions = accountGame
    ? sessionsAll.filter((session) => session.account_id === accountGame)
    : sessionsAll;

  const yearFromFilter = (AppState.getFilter('yearGame') as number | '') || '';
  const globalYear = (AppState.getFilter('year') as number | '') || '';
  const availableYears = getAvailableYearsFromSessions(scopedSessions);
  const selectedYear =
    typeof yearFromFilter === 'number' && yearFromFilter > 0
      ? yearFromFilter
      : typeof globalYear === 'number' && globalYear > 0
        ? globalYear
        : availableYears[0] || null;

  if (!selectedYear) {
    if (summaryEl) summaryEl.textContent = '';
    if (monthChartEl) (getECByDom(monthChartEl as HTMLElement) as any)?.clear?.();
    if (heatmapEl) (getECByDom(heatmapEl as HTMLElement) as any)?.clear?.();
    return;
  }

  if ((AppState.getFilter('yearGame') as Filters['yearGame']) !== selectedYear) {
    AppState.setFilter('yearGame', selectedYear as Filters['yearGame']);
  }

  setSelectValue('gameYearFilter', String(selectedYear));
  setSelectValue('gameAccountFilter', accountGame || '');
  setSelectValue('gameSelect', appid);

  updateLabelWithYear('lblGameMonth', selectedYear, String(selectedYear));
  updateLabelWithYear('lblGameDailyHeatmap', selectedYear, String(selectedYear));

  const { months, yearData } = await computeGameAggregations(
    client,
    scopedSessions,
    appid,
    selectedYear
  );

  const monthLabels = Array.from({ length: 12 }, (_, idx) => String(idx + 1).padStart(2, '0'));
  renderBarInto(monthChartEl as HTMLElement | null, monthLabels, months);
  renderCalendarHeatmapTS(heatmapEl as HTMLElement | null, selectedYear, yearData);

  if (summaryEl) {
    const yearSessions = scopedSessions.filter(
      (session) => session.appid === appid && session.start.getFullYear() === selectedYear
    );
    const totalSeconds = sum(yearSessions.map((session) => session.duration || 0));
    const longestSession = yearSessions.reduce(
      (max, session) => Math.max(max, session.duration || 0),
      0
    );

    let longestStreak = 0;
    let currentStreak = 0;
    let previousDay: number | null = null;
    const sorted = [...yearData].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    sorted.forEach(([dateStr, hours]) => {
      if (hours <= 0) return;
      const date = new Date(dateStr);
      if (previousDay != null) {
        const diffDays = Math.round((date.getTime() - previousDay) / 86400000);
        currentStreak = diffDays === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      previousDay = date.getTime();
      longestStreak = Math.max(longestStreak, currentStreak);
    });

    const summaryParts = [
      `${yearSessions.length} ${(i18n?.t?.('statSessions') || 'Sessions').toLowerCase()}`,
      `${i18n?.t?.('statDuration') || 'Total Duration'}: ${fmtDur(totalSeconds)}`,
      `${i18n?.t?.('longestStreak') || 'Longest streak'}: ${longestStreak} ${i18n?.t?.('days') || 'days'}`,
      `${i18n?.t?.('longestSession') || 'Longest session'}: ${fmtDur(longestSession)}`,
    ];
    summaryEl.textContent = summaryParts.join(' · ');
  }
}

export function populateFilters() {
  const sessions = AppState.getSessions();
  const accountFilter = document.getElementById('accountFilter') as HTMLSelectElement | null;
  const summaryYearFilter = document.getElementById(
    'summaryYearFilter'
  ) as HTMLSelectElement | null;
  const gameYearFilter = document.getElementById('gameYearFilter') as HTMLSelectElement | null;
  const gameAccountFilter = document.getElementById(
    'gameAccountFilter'
  ) as HTMLSelectElement | null;
  const gameSelect = document.getElementById('gameSelect') as HTMLSelectElement | null;
  const i18n: any = (window as any).i18n;

  const accounts = Array.from(new Set(sessions.map((session) => session.account_id))).sort();
  const years = getAvailableYearsFromSessions(sessions);
  const games = Array.from(
    new Map(sessions.map((session) => [session.appid, session.app_name || session.appid])).entries()
  )
    .map(([appid, name]) => ({ appid, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (accountFilter) {
    accountFilter.innerHTML =
      `<option value="">${i18n?.t?.('allAccounts') || 'All accounts'}</option>` +
      accounts.map((account) => `<option value="${account}">${account}</option>`).join('');
  }

  if (summaryYearFilter) {
    summaryYearFilter.innerHTML =
      `<option value="">${ALL_YEARS_LABEL()}</option>` +
      years.map((year) => `<option value="${year}">${year}</option>`).join('');
  }

  if (gameYearFilter) {
    gameYearFilter.innerHTML = years
      .map((year) => `<option value="${year}">${year}</option>`)
      .join('');
  }

  if (gameAccountFilter) {
    gameAccountFilter.innerHTML =
      `<option value="">${i18n?.t?.('allAccounts') || 'All accounts'}</option>` +
      accounts.map((account) => `<option value="${account}">${account}</option>`).join('');
  }

  if (gameSelect) {
    const head = `<option value="">${i18n?.t?.('pleaseSelectGame') || 'Please select a game'}</option>`;
    gameSelect.innerHTML =
      head +
      games
        .map((game) => `<option value="${game.appid}">${escapeHtml(game.name)}</option>`)
        .join('');
  }

  // Re-apply current selections if still valid
  setSelectValue('accountFilter', (AppState.getFilter('account') as string) || '');
  const rawGlobalYear = AppState.getFilter('year') as number | '';
  setSelectValue('summaryYearFilter', rawGlobalYear ? String(rawGlobalYear) : '');
  setSelectValue(
    'gameAccountFilter',
    (AppState.getFilter('accountGame') as string) || (AppState.getFilter('account') as string) || ''
  );
  const rawYearGame = AppState.getFilter('yearGame') as number | '';
  const preferredYear =
    (typeof rawYearGame === 'number' && rawYearGame > 0
      ? rawYearGame
      : typeof rawGlobalYear === 'number' && rawGlobalYear > 0
        ? rawGlobalYear
        : '') || (years.length ? years[0] : '');
  if (preferredYear) setSelectValue('gameYearFilter', String(preferredYear));
  setSelectValue('gameSelect', (AppState.getFilter('appidGame') as string) || '');
}
