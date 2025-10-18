import type { Filters, Session } from '@types';
import { AppState } from '@state/appState';

import { createI18n } from './i18n';
import { parseService } from './state/parseService';
import { AggregatorClient } from './state/aggregatorClient';
import { loadAppList, resolveAppNamesFromCache } from './state/appListCache';
import { applyStaticLabels, registerUIEvents } from './view/viewInit';
import { renderApp, populateFilters, getAvailableYearsFromSessions } from './view/renderPipeline';

const i18n = createI18n('en');

// Warm up the AppList cache as soon as the bundle loads so lookups are instant when users upload logs.
loadAppList().catch((err) => {
  console.warn('App list preload failed; will retry on demand', err);
});

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
const manualPicker = $('#manualPicker') as HTMLInputElement | null;
const uploadDrop = document.getElementById('uploadDrop') as HTMLElement | null;
const uploadSection = document.getElementById('sectionA') as HTMLElement | null;

let activeParseToken = 0;

function setUploadBusy(busy: boolean) {
  if (uploadDrop) {
    uploadDrop.classList.toggle('is-busy', busy);
    uploadDrop.setAttribute('aria-busy', busy ? 'true' : 'false');
    let mask = document.getElementById('uploadBusyMask') as HTMLElement | null;
    if (busy) {
      if (!mask) {
        mask = document.createElement('div');
        mask.id = 'uploadBusyMask';
        mask.className = 'upload-drop__mask';
        const row = document.createElement('div');
        row.className = 'loading-row';
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        const label = document.createElement('span');
        label.dataset.uploadBusyLabel = 'true';
        row.append(spinner, label);
        mask.appendChild(row);
        uploadDrop.appendChild(mask);
      }
      if (mask) {
        const label = mask.querySelector('[data-upload-busy-label]') as HTMLElement | null;
        if (label) label.textContent = i18n.t('processingLogs') || 'Processing logs...';
      }
    } else if (mask) {
      mask.remove();
    }
  }

  if (uploadSection) uploadSection.setAttribute('aria-busy', busy ? 'true' : 'false');

  [manualPicker, connLog, contLog].forEach((input) => {
    if (input) input.disabled = busy;
  });
}

function applySessionsToDashboard(sessions: Session[], opts: { initial: boolean }) {
  AppState.setSessions(sessions);
  const years = getAvailableYearsFromSessions(sessions);
  const latestYear = years.length ? years[0] : null;

  if (opts.initial) {
    const defaultYear = (latestYear ?? '') as Filters['year'];
    AppState.setFilter('year', defaultYear);
    AppState.setFilter('yearGame', defaultYear as Filters['yearGame']);
    AppState.setFilter('appidGame', '' as Filters['appidGame']);
    if (!(AppState.getFilter('accountGame') as string)) {
      AppState.setFilter('accountGame', (AppState.getFilter('account') as string) || '');
    }
  } else {
    const currentYear = AppState.getFilter('year') as Filters['year'];
    if (typeof currentYear === 'number' && !years.includes(currentYear)) {
      AppState.setFilter('year', (latestYear ?? '') as Filters['year']);
    }
    const currentYearGame = AppState.getFilter('yearGame') as Filters['yearGame'];
    if (typeof currentYearGame === 'number' && !years.includes(currentYearGame)) {
      AppState.setFilter('yearGame', (latestYear ?? '') as Filters['yearGame']);
    }
  }

  populateFilters();

  if (opts.initial) {
    const sectionB = document.getElementById('sectionB') as HTMLElement | null;
    sectionB?.classList.remove('is-hidden');
    const sectionC = document.getElementById('sectionC') as HTMLElement | null;
    sectionC?.classList.remove('is-hidden');
  }

  window.render();
}

async function hydrateSessionsWithAppNames(token: number, sessions: Session[]) {
  try {
    await loadAppList();
    if (token !== activeParseToken) return;

    const ids = Array.from(new Set(sessions.map((s) => s.appid))).filter((id): id is string =>
      Boolean(id)
    );
    if (!ids.length) return;

    const nameMap = resolveAppNamesFromCache(ids);
    let changed = false;
    const enriched = sessions.map((s) => {
      const nextName = nameMap[s.appid];
      if (nextName && nextName !== (s.app_name || s.appid)) {
        changed = true;
        return { ...s, app_name: nextName };
      }
      return s;
    });

    if (!changed) return;
    if (token !== activeParseToken) return;

    applySessionsToDashboard(enriched, { initial: false });
  } catch (err) {
    console.warn('loadAppList/resolveAppNamesFromCache failed, fallback to appid only', err);
  }
}

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
  if (parseService.isBusy()) return;
  const f1 = connLog.files && connLog.files[0];
  const f2 = contLog.files && contLog.files[0];
  if (!f1 || !f2) {
    alert(i18n.t('alertSelectLogs'));
    return;
  }
  try {
    setUploadBusy(true);
    const token = ++activeParseToken;
    const sessions = (await parseService.parse(f1, f2)) as Session[];
    applySessionsToDashboard(sessions, { initial: true });
    void hydrateSessionsWithAppNames(token, sessions);
  } catch (e: any) {
    console.error('parse failed', e);
    alert(i18n.t('alertParseFailed', e?.message || String(e)));
  } finally {
    setUploadBusy(false);
  }
}
