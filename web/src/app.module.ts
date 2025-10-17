import { AppState } from '@state/appState';

import { createI18n } from './i18n';
import { parseService } from './state/parseService';
import { AggregatorClient } from './state/aggregatorClient';
import { loadAppList, resolveAppNamesFromCache } from './state/appListCache';
import { applyStaticLabels, registerUIEvents } from './view/viewInit';
import { renderApp, populateFilters } from './view/renderPipeline';

const i18n = createI18n('en');

declare global {
  interface Window {
    i18n: any;
    render: () => void;
  }
}

window.i18n = i18n;
const titleEl = document.getElementById('title');
if (titleEl) titleEl.textContent = i18n.t('appTitle');
applyStaticLabels(i18n);

const $ = (sel: string) => document.querySelector(sel) as any;
const connLog = $('#connLog') as HTMLInputElement;
const contLog = $('#contLog') as HTMLInputElement;

let aggregatorClient: AggregatorClient | null = null;
(function ensureAggregator() {
  try {
    aggregatorClient = new AggregatorClient(
      new Worker(new URL('./workers/aggregator.worker.ts', import.meta.url), { type: 'module' })
    );
  } catch (e) {
    console.warn('Aggregator worker init failed', e);
  }
})();

window.render = function render() {
  renderApp(i18n, aggregatorClient, () => window.render());
};

registerUIEvents({
  i18n,
  AppState,
  onRender: () => renderApp(i18n, aggregatorClient, () => window.render()),
  onHandleParse: handleParse,
});

async function handleParse() {
  const f1 = connLog.files && connLog.files[0];
  const f2 = contLog.files && contLog.files[0];
  if (!f1 || !f2) {
    alert(i18n.t('alertSelectLogs'));
    return;
  }
  try {
    let sessions = await parseService.parse(f1, f2);
    try {
      await loadAppList();
      const ids = Array.from(new Set(sessions.map((s: any) => s.appid)));
      const nameMap = resolveAppNamesFromCache(ids);
      sessions = sessions.map((s: any) => ({
        ...s,
        app_name: (nameMap as any)[s.appid] || s.app_name || s.appid,
      }));
    } catch (err) {
      console.warn('loadAppList/resolveAppNamesFromCache failed, fallback to appid only', err);
    }
    AppState.setSessions(sessions);
    populateFilters();
    // Default to current year for Summary charts (global year filter)
    const y = new Date().getFullYear();
    AppState.setFilter('year', y as any);
    const summaryYearFilter = document.getElementById(
      'summaryYearFilter'
    ) as HTMLSelectElement | null;
    if (summaryYearFilter) summaryYearFilter.value = String(y);
    // Show Summary and Per-game sections
    const sectionB = document.getElementById('sectionB') as HTMLElement | null;
    sectionB?.classList.remove('is-hidden');
    const sectionC = document.getElementById('sectionC') as HTMLElement | null;
    sectionC?.classList.remove('is-hidden');
    window.render();
  } catch (e: any) {
    console.error('parse failed', e);
    alert(i18n.t('alertParseFailed', e?.message || String(e)));
  }
}
