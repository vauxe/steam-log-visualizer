import { init as echartsInit, use as echartsUse, getInstanceByDom as getECByDom } from 'echarts/core';
import { BarChart as ECBarChart } from 'echarts/charts';
import { GridComponent as ECGridComponent, TooltipComponent as ECTooltipComponent } from 'echarts/components';
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


echartsUse([ECBarChart, ECGridComponent, ECTooltipComponent, ECCanvasRenderer]);

function groupByGame(list: any[]) {
  const map = new Map<string, any>();
  for (const s of list) {
    const key = s.appid;
    const name = s.app_name || s.appid;
    if (!map.has(key)) map.set(key, { appid: s.appid, name, sessions: [] });
    (map.get(key) as any).sessions.push(s);
  }
  return Array.from(map.values()).sort((a: any, b: any) => b.sessions.length - a.sessions.length);
}

function renderTextSummary(i18n: any, data: any[], groups: any[]) {
  const elSessions = document.querySelector('#statSessions') as HTMLElement | null;
  if (elSessions) elSessions.textContent = data.length.toLocaleString();
  const totalSec = sum(data.map((s: any) => s.duration || 0));
  const elDuration = document.querySelector('#statDuration') as HTMLElement | null;
  if (elDuration) elDuration.textContent = fmtDur(totalSec);
  const accounts = new Set(data.map((s: any) => s.account_id)).size;
  const elAccounts = document.querySelector('#statAccounts') as HTMLElement | null;
  if (elAccounts) elAccounts.textContent = accounts.toString();
  const elGames = document.querySelector('#statGames') as HTMLElement | null;
  if (elGames) elGames.textContent = groups.length.toString();
  // overall text paragraph if exists
  const overall = document.getElementById('overallText') as HTMLElement | null;
  if (overall) {
    const parts = [
      `${accounts} ${(i18n?.t?.('statAccounts') || 'Accounts').toLowerCase()}`,
      `${groups.length} ${(i18n?.t?.('statGames') || 'Games').toLowerCase()}`,
      `${data.length} ${(i18n?.t?.('statSessions') || 'Sessions').toLowerCase()}`,
      `${i18n?.t?.('statDuration') || 'Total Duration'}: ${fmtDur(totalSec)}`,
    ];
    overall.textContent = parts.join(' · ');
  }
}

function showLoading(inProgress: boolean) {
  const sectionB = document.getElementById('sectionB') as HTMLElement | null;
  if (!sectionB) return;
  let mask = document.getElementById('loadingMask') as HTMLElement | null;
  if (inProgress) {
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'loadingMask';
      mask.className = 'loading-mask';
      mask.innerHTML = '<div class="loading-row"><span class="spinner"></span><span>Processing...</span></div>';
      sectionB.prepend(mask);
    }
  } else if (mask) {
    mask.remove();
  }
}

async function computeAllAggregations(client: AggregatorClient | null, data: any[]) {
  const result: { months: number[]; yearData: [string, number][] } = { months: [], yearData: [] };
  if (!client) return result;
  const agg = makeAggregator(client, () => ({ sessions: data, filters: AppState.getFilters() }));
  const selectedYear = (AppState.getFilter('year') as any) || new Date().getFullYear();
  const pMonth = agg('month', { sessions: data, opts: { fillYear: selectedYear } }).then(
    ({ values }) => values as number[]
  );
  const pDay = agg('day', { sessions: data, opts: { fillYear: selectedYear } }).then(
    ({ yearData }) => yearData as [string, number][]
  );
  const [months, yearData] = await Promise.all([pMonth, pDay]);
  result.months = months;
  result.yearData = yearData;
  return result;
}

let LAST_YEAR: any = undefined;
let LAST_ACCOUNT: any = undefined;

export async function renderApp(
  i18n: any,
  aggregatorClient: AggregatorClient | null,
  onRender?: () => void
) {
  const data = getFilteredSessions();
  const groups = groupByGame(data);
  // 1) Show loading mask and run aggregations in parallel
  showLoading(true);
  const { months, yearData } = await computeAllAggregations(aggregatorClient, data);
  showLoading(false);
  // 2) Render sections top-down, independently
  renderTextSummary(i18n, data, groups);
  renderGameBarTS(groups, (appid) => {
    // Top interactions drive per-game (bottom) defaults, one-way
    AppState.setFilter('appidGame', appid);
    const y = (AppState.getFilter('year') as any) || new Date().getFullYear();
    AppState.setFilter('yearGame', y);
    const acc = (AppState.getFilter('account') as any) || '';
    AppState.setFilter('accountGame', acc);
    const gameYearEl = document.getElementById('gameYearFilter') as HTMLSelectElement | null;
    if (gameYearEl) gameYearEl.value = String(y);
    const gameSelect = document.getElementById('gameSelect') as HTMLSelectElement | null;
    if (gameSelect) gameSelect.value = appid || '';
    const gameAccEl = document.getElementById('gameAccountFilter') as HTMLSelectElement | null;
    if (gameAccEl) gameAccEl.value = acc || '';
    if (onRender) onRender();
  });
  renderGamePieTS(groups, (appid) => {
    // Top interactions drive per-game (bottom) defaults, one-way
    AppState.setFilter('appidGame', appid);
    const y = (AppState.getFilter('year') as any) || new Date().getFullYear();
    AppState.setFilter('yearGame', y);
    const acc = (AppState.getFilter('account') as any) || '';
    AppState.setFilter('accountGame', acc);
    const gameYearEl = document.getElementById('gameYearFilter') as HTMLSelectElement | null;
    if (gameYearEl) gameYearEl.value = String(y);
    const gameSelect = document.getElementById('gameSelect') as HTMLSelectElement | null;
    if (gameSelect) gameSelect.value = appid || '';
    const gameAccEl = document.getElementById('gameAccountFilter') as HTMLSelectElement | null;
    if (gameAccEl) gameAccEl.value = acc || '';
    if (onRender) onRender();
  });
  renderMonthChartTS(months || []);
  const selectedYear = (AppState.getFilter('year') as any) || new Date().getFullYear();
  const lbl = document.getElementById('lblDailyHeatmap') as HTMLElement | null;
  if (lbl) {
    if (!(lbl as any).dataset.base) (lbl as any).dataset.base = lbl.textContent || '';
    const yearText = selectedYear ? String(selectedYear) : i18n?.t?.('allYears') || 'All years';
    lbl.textContent = `${(lbl as any).dataset.base} (${yearText})`;
  }
  renderCalendarHeatmapTS(
    document.querySelector('#calendarYear'),
    Number(selectedYear),
    yearData || []
  );

  // Choose default per-game: top by playtime for effective year (global year or current year if All)
  const curYear = (AppState.getFilter('year') as any) || '';
  const curAcc = (AppState.getFilter('account') as any) || '';
  const effYear = curYear || new Date().getFullYear();
  const sessionsAll = AppState.getSessions();
  const sessionsForPick = sessionsAll.filter((s: any) =>
    (!curAcc || s.account_id === curAcc) && s.start?.getFullYear?.() === Number(effYear)
  );
  const totalsMap = new Map<string, number>();
  for (const s of sessionsForPick) {
    const sec = (s.duration || 0);
    totalsMap.set(s.appid, (totalsMap.get(s.appid) || 0) + sec);
  }
  const top = Array.from(totalsMap.entries())
    .map(([appid, sec]) => ({ appid, sec }))
    .sort((a, b) => b.sec - a.sec)[0];
  const curSel = (AppState.getFilter('appidGame') as any) || '';
  const topChangedContext = (curYear !== LAST_YEAR) || (curAcc !== LAST_ACCOUNT);
  // Always sync per-game year/account to top when top changes; and set per-game game to top-of-year
  if (topChangedContext) {
    AppState.setFilter('yearGame', effYear);
    AppState.setFilter('accountGame', curAcc || '');
    const gameYearEl = document.getElementById('gameYearFilter') as HTMLSelectElement | null;
    if (gameYearEl) gameYearEl.value = String(effYear);
    const gameAccEl = document.getElementById('gameAccountFilter') as HTMLSelectElement | null;
    if (gameAccEl) gameAccEl.value = String(curAcc || '');
    if (top && top.appid) {
      AppState.setFilter('appidGame', top.appid);
      const gameSelect = document.getElementById('gameSelect') as HTMLSelectElement | null;
      if (gameSelect && gameSelect.value !== top.appid) gameSelect.value = top.appid;
    }
  } else if (!curSel && top && top.appid) {
    // If no per-game selection yet, pick the top game as default
    AppState.setFilter('appidGame', top.appid);
    const gameSelect = document.getElementById('gameSelect') as HTMLSelectElement | null;
    if (gameSelect && gameSelect.value !== top.appid) gameSelect.value = top.appid;
  }
  LAST_YEAR = curYear;
  LAST_ACCOUNT = curAcc;

  await renderGameDetails(i18n, aggregatorClient);
}


// ---- Per-game rendering helpers ----

async function computeGameAggregations(
  client: AggregatorClient | null,
  data: any[],
  appid: string,
  selectedYear: number
) {
  const result: { months: number[]; yearData: [string, number][]; grid: number[][] } = {
    months: [],
    yearData: [],
    grid: Array.from({ length: 7 }, () => Array(24).fill(0)),
  };
  if (!client || !appid || !selectedYear) return result;
  const sessions = data.filter((s: any) => s.appid === appid);
  const agg = makeAggregator(client, () => ({ sessions, filters: AppState.getFilters() }));
  const pMonth = agg('month', { sessions, opts: { fillYear: selectedYear } }).then(
    ({ values }) => values as number[]
  );
  const pDay = agg('day', { sessions, opts: { fillYear: selectedYear } }).then(
    ({ yearData }) => yearData as [string, number][]
  );
  const pHour = agg('hour', { sessions }).then(({ grid }) => grid as number[][]);
  const [months, yearData, grid] = await Promise.all([pMonth, pDay, pHour]);
  result.months = months || [];
  result.yearData = yearData || [];
  result.grid = grid || result.grid;
  return result;
}

function renderBarInto(el: HTMLElement | null, labels: string[], values: number[]) {
  if (!el) return;
  if (el.clientWidth === 0 || el.clientHeight === 0) return; // avoid init on hidden
  const chart = (getECByDom(el) as any) || echartsInit(el, null, { renderer: 'canvas' });
  chart.setOption(createBarOption(labels, values) as any);
}

async function renderGameDetails(i18n: any, client: AggregatorClient | null) {
  const sectionC = document.getElementById('sectionC') as HTMLElement | null;
  if (!sectionC) return;
  const appid = (AppState.getFilter('appidGame') as any) || '';
  const gameSelect = document.getElementById('gameSelect') as HTMLSelectElement | null;
  const gameYearEl = document.getElementById('gameYearFilter') as HTMLSelectElement | null;
  const gameAccEl = document.getElementById('gameAccountFilter') as HTMLSelectElement | null;
  if (gameSelect && appid && gameSelect.value !== appid) gameSelect.value = appid;
  // Per-game data source: independent of global filters; filter by per-game account only
  const accountGame = (AppState.getFilter('accountGame') as any) || '';
  const allSessions = AppState.getSessions();
  const dataAll = accountGame ? allSessions.filter((s: any) => s.account_id === accountGame) : allSessions;
  if (gameAccEl && gameAccEl.value !== (accountGame || '')) gameAccEl.value = accountGame || '';

  // Determine selected year for per-game view
  let selectedYear: number | '' = '';
  const yearGame = (AppState.getFilter('yearGame') as any) || '';
  const yearGlobal = (AppState.getFilter('year') as any) || '';
  if (gameYearEl && gameYearEl.value) selectedYear = Number(gameYearEl.value);
  else if (yearGame) selectedYear = Number(yearGame);
  else if (yearGlobal) selectedYear = Number(yearGlobal);
  else if (appid) {
    // Req.3: if clicking a game while "All years", treat as current year
    selectedYear = new Date().getFullYear();
    AppState.setFilter('yearGame', selectedYear);
    if (gameYearEl) gameYearEl.value = String(selectedYear);
  }

  const summaryEl = document.getElementById('gameSummaryText') as HTMLElement | null;
  const monthChartEl = document.getElementById('gameMonthChart') as HTMLElement | null;
  const calYearEl = document.getElementById('gameCalendarYear') as HTMLElement | null;
  const lblMonth = document.getElementById('lblGameMonth') as HTMLElement | null;
  const lblDaily = document.getElementById('lblGameDailyHeatmap') as HTMLElement | null;

  // Hide/show when not ready (no game or no year)
  const ready = Boolean(appid && selectedYear);
  if (!ready) {
    if (summaryEl) { summaryEl.textContent = ''; summaryEl.style.display = 'none'; }
    if (lblMonth) lblMonth.style.display = 'none';
    if (lblDaily) lblDaily.style.display = 'none';
    if (monthChartEl) { monthChartEl.style.display = 'none'; (getECByDom(monthChartEl) as any)?.dispose?.(); monthChartEl.innerHTML = ''; }
    if (calYearEl)   { calYearEl.style.display   = 'none'; (getECByDom(calYearEl) as any)?.dispose?.();   calYearEl.innerHTML   = ''; }
    return;
  }
  if (summaryEl) summaryEl.style.display = '';
  if (lblMonth) lblMonth.style.display = '';
  if (lblDaily) lblDaily.style.display = '';
  if (monthChartEl) { monthChartEl.style.display = ''; monthChartEl.style.visibility = 'visible'; }
  if (calYearEl)   { calYearEl.style.display   = ''; calYearEl.style.visibility   = 'visible'; }

  const { months, yearData, grid: _grid } = await computeGameAggregations(
    client,
    dataAll,
    appid,
    Number(selectedYear)
  );

  // Update labels with (year)
  if (lblMonth) {
    if (!(lblMonth as any).dataset.base) (lblMonth as any).dataset.base = lblMonth.textContent || '';
    lblMonth.textContent = `${(lblMonth as any).dataset.base} (${String(selectedYear)})`;
  }
  if (lblDaily) {
    if (!(lblDaily as any).dataset.base) (lblDaily as any).dataset.base = lblDaily.textContent || '';
    lblDaily.textContent = `${(lblDaily as any).dataset.base} (${String(selectedYear)})`;
  }

  // Month chart
  const labels = [...Array(12)].map((_, i) => String(i + 1).padStart(2, '0'));
  renderBarInto(monthChartEl, labels, months || []);

  // Daily calendar heatmap
  renderCalendarHeatmapTS(calYearEl, Number(selectedYear), yearData || []);

  // Stats summary: sessions, total duration, longest streak, longest session (Req.4)
  if (summaryEl) {
    const gameSessions = dataAll.filter((s: any) => s.appid === appid);
    const gameSessionsYear = gameSessions.filter(
      (s: any) => s.start && s.start.getFullYear && s.start.getFullYear() === Number(selectedYear)
    );
    const sec = sum(gameSessionsYear.map((s: any) => s.duration || 0));
    const sessionsN = gameSessionsYear.length;

    // Longest streak from yearData (consecutive days with value>0)
    let longestStreak = 0;
    let cur = 0;
    let prevDate: number | null = null;
    const y = (yearData || []).slice().sort((a, b) => (a[0] < b[0] ? -1 : 1));
    for (const [ds, v] of y) {
      const d = new Date(ds);
      if (v > 0) {
        if (prevDate !== null) {
          const diff = Math.round((d.getTime() - prevDate) / 86400000);
          cur = diff === 1 ? cur + 1 : 1;
        } else cur = 1;
        if (cur > longestStreak) longestStreak = cur;
        prevDate = d.getTime();
      }
    }

    // Longest single session (seconds)
    let longestSessionSec = 0;
    for (const s of gameSessionsYear) longestSessionSec = Math.max(longestSessionSec, s.duration || 0);

    const msg = [
      `${sessionsN} ${(i18n?.t?.('statSessions') || 'Sessions').toLowerCase()}`,
      `${i18n?.t?.('statDuration') || 'Total Duration'}: ${fmtDur(sec)}`,
      `${i18n?.t?.('longestStreak') || 'Longest streak'}: ${longestStreak} ${(i18n?.t?.('days') || 'days')}`,
      `${i18n?.t?.('longestSession') || 'Longest session'}: ${fmtDur(longestSessionSec)}`,
    ].join(' · ');
    summaryEl.textContent = msg;
  }
}

export function populateFilters() {
  const sessions = AppState.getSessions();
  // Accounts
  const accountFilter = document.getElementById('accountFilter') as HTMLSelectElement;
  if (accountFilter) {
    const accounts = Array.from(new Set(sessions.map((s: any) => s.account_id))).sort();
    const i18n: any = (window as any).i18n;
    accountFilter.innerHTML =
      `<option value="">${i18n?.t?.('allAccounts') || 'All accounts'}</option>` +
      accounts.map((a) => `<option value="${a}">${a}</option>`).join('');
  }
  // Years
  const yearFilter = document.getElementById('yearFilter') as HTMLSelectElement | null;
  const summaryYearFilter = document.getElementById(
    'summaryYearFilter'
  ) as HTMLSelectElement | null;
  const years = Array.from(new Set(sessions.map((s: any) => s.start.getFullYear()))).sort(
    (a, b) => b - a
  );
  const i18n: any = (window as any).i18n;
  if (yearFilter) {
    yearFilter.innerHTML =
      `<option value="">${i18n?.t?.('allYears') || 'All years'}</option>` +
      years.map((y) => `<option value="${y}">${y}</option>`).join('');
  }
  if (summaryYearFilter) {
    summaryYearFilter.innerHTML =
      `<option value="">${i18n?.t?.('allYears') || 'All years'}</option>` +
      years.map((y) => `<option value="${y}">${y}</option>`).join('');
  }
  // Per-game year filter
  const gameYearFilter = document.getElementById('gameYearFilter') as HTMLSelectElement | null;
  if (gameYearFilter) {
    gameYearFilter.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join('');
    const yg =
      (AppState.getFilter('yearGame') as any) ||
      (AppState.getFilter('year') as any) ||
      years[0];
    if (yg) {
      gameYearFilter.value = String(yg);
      AppState.setFilter('yearGame', Number(yg));
    }
  }
  // Per-game account filter
  const gameAccountFilter = document.getElementById('gameAccountFilter') as HTMLSelectElement | null;
  if (gameAccountFilter) {
    const accounts = Array.from(new Set(sessions.map((s: any) => s.account_id))).sort();
    const i18nAny: any = (window as any).i18n;
    gameAccountFilter.innerHTML =
      `<option value="">${i18nAny?.t?.('allAccounts') || 'All accounts'}</option>` +
      accounts.map((a) => `<option value="${a}">${a}</option>`).join('');
    const ag = (AppState.getFilter('accountGame') as any) || (AppState.getFilter('account') as any) || '';
    gameAccountFilter.value = String(ag || '');
    AppState.setFilter('accountGame', String(ag || ''));
  }
  // Games multi-select
  const gameMulti = document.getElementById('gameMulti') as HTMLSelectElement | null;
  const gameSelect = document.getElementById('gameSelect') as HTMLSelectElement | null;
  const games = Array.from(
    new Map(sessions.map((s: any) => [s.appid, s.app_name || s.appid])).entries()
  )
    .map(([appid, name]) => ({ appid, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (gameMulti) {
    gameMulti.innerHTML = games
      .map((g) => `<option value="${g.appid}">${escapeHtml(g.name)}</option>`)
      .join('');
  }
  if (gameSelect) {
    const i18n: any = (window as any).i18n;
    const head = `<option value="">${i18n?.t?.('pleaseSelectGame') || 'Please select a game'}</option>`;
    gameSelect.innerHTML = head +
      games.map((g) => `<option value="${g.appid}">${escapeHtml(g.name)}</option>`).join('');
  }
}

export function highlightMatches(q: string) {
  const query = (q || '').toLowerCase();
  const items = document.querySelectorAll('#gameList .game-item');
  items.forEach((el) => {
    const title = el.querySelector('div > div');
    if (!title) return;
    const text = title.textContent || '';
    if (!query) {
      (title as HTMLElement).innerHTML = escapeHtml(text);
      return;
    }
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) {
      (title as HTMLElement).innerHTML = escapeHtml(text);
      return;
    }
    const before = escapeHtml(text.slice(0, idx));
    const hit = escapeHtml(text.slice(idx, idx + query.length));
    const after = escapeHtml(text.slice(idx + query.length));
    (title as HTMLElement).innerHTML = `${before}<mark class="hit">${hit}</mark>${after}`;
  });
}
