import type { FilterKey } from '@state/appState';
import type { Filters } from '@types';

export function applyStaticLabels(i18n: any) {
  const pairs: Array<[string, string]> = [
    ['uploadTitle', 'upload'],
    ['uploadSubtitle', 'uploadSubtitle'],
    ['uploadHintDrag', 'uploadHintDrag'],
    ['uploadHintOr', 'uploadHintOr'],
    ['uploadLink', 'uploadLink'],
    ['uploadDisclaimer', 'uploadDisclaimer'],
    ['uploadStepLocate', 'uploadStepLocate'],
    ['uploadStepSelect', 'uploadStepSelect'],
    ['uploadStepUpload', 'uploadStepUpload'],
    ['lblStatSessions', 'statSessions'],
    ['lblStatDuration', 'statDuration'],
    ['lblStatAccounts', 'statAccounts'],
    ['lblStatGames', 'statGames'],
    ['lblAccount', 'account'],
    ['lblSummaryYear', 'filtersYear'],
    ['lblTopAll', 'topAll'],
    ['lblDonut', 'donut'],
    ['lblMonthChart', 'monthChart'],
    ['lblDailyHeatmap', 'dailyHeatmap'],
    ['lblGameAccount', 'account'],
    ['lblGameYear', 'filtersYear'],
    ['lblGameSelect', 'selectGame'],
    ['lblGameMonth', 'gameMonth'],
    ['lblGameDailyHeatmap', 'gameDailyHeatmap'],
    ['navDashboard', 'navDashboard'],
    ['navStarMap', 'navStarMap'],
  ];
  const m = new Map<string, string>(pairs);
  for (const [id, key] of m) {
    const el = document.getElementById(id);
    if (el) {
      (el as HTMLElement).textContent = i18n.t(key as any);
    }
  }

  const accountSel = document.getElementById('accountFilter');
  if (accountSel) {
    const first = accountSel.querySelector('option');
    if (first) (first as HTMLElement).textContent = i18n.t('allAccounts');
  }
}

export function registerUIEvents(params: {
  i18n: any;
  AppState: { setFilter: (k: any, v: any) => void; getSessions: () => any[] };
  onRender: () => void;
  onHandleParse: () => void;
}) {
  const { i18n, AppState, onRender, onHandleParse } = params;
  const langSelect = document.getElementById('langSelect') as HTMLSelectElement | null;
  const titleEl = document.getElementById('title');
  if (langSelect) {
    langSelect.value = i18n.locale;
    langSelect.addEventListener('change', () => {
      i18n.setLocale(langSelect.value);
      if (titleEl) (titleEl as HTMLElement).textContent = i18n.t('appTitle');
      applyStaticLabels(i18n);
      onRender();
    });
  }

  const connLog = document.getElementById('connLog') as HTMLInputElement;
  const contLog = document.getElementById('contLog') as HTMLInputElement;
  const manualPicker = document.getElementById('manualPicker') as HTMLInputElement | null;
  const uploadLink = document.getElementById('uploadLink') as HTMLButtonElement | null;
  const uploadDrop = document.getElementById('uploadDrop') as HTMLElement | null;
  const accountFilter = document.getElementById('accountFilter') as HTMLSelectElement;
  const summaryYearFilter = document.getElementById(
    'summaryYearFilter'
  ) as HTMLSelectElement | null;
  const gameSelect = document.getElementById('gameSelect') as HTMLSelectElement | null;
  const gameYearFilter = document.getElementById('gameYearFilter') as HTMLSelectElement | null;
  const gameAccountFilter = document.getElementById(
    'gameAccountFilter'
  ) as HTMLSelectElement | null;

  const maybeAutoParse = () => {
    if (connLog.files && connLog.files[0] && contLog.files && contLog.files[0]) onHandleParse();
  };

  const setInputFile = (input: HTMLInputElement, file: File | null) => {
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  };

  const assignLogsFromFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const pick = (match: (file: File) => boolean) => {
      const index = files.findIndex(match);
      if (index === -1) return null;
      return files.splice(index, 1)[0];
    };
    const isConn = (name: string) => /connection[_\s-]*log.*\.txt$/i.test(name);
    const isCont = (name: string) => /content[_\s-]*log.*\.txt$/i.test(name);
    const connection =
      pick((f) => f.name.toLowerCase() === 'connection_log.txt') || pick((f) => isConn(f.name));
    const content =
      pick((f) => f.name.toLowerCase() === 'content_log.txt') || pick((f) => isCont(f.name));
    if (connection) setInputFile(connLog, connection);
    if (content) setInputFile(contLog, content);
    maybeAutoParse();
  };

  connLog.addEventListener('change', () => {
    maybeAutoParse();
  });

  if (manualPicker) {
    manualPicker.addEventListener('change', () => {
      assignLogsFromFiles(manualPicker.files || []);
      manualPicker.value = '';
    });
  }

  if (uploadLink) {
    uploadLink.addEventListener('click', (event) => {
      event.preventDefault();
      manualPicker?.click();
    });
  }
  contLog.addEventListener('change', () => {
    maybeAutoParse();
  });
  const bindSelect = <K extends FilterKey>(
    el: HTMLSelectElement | null,
    key: K,
    map: (value: string) => Filters[K]
  ) => {
    if (!el) return;
    el.addEventListener('change', () => {
      AppState.setFilter(key, map(el.value));
      onRender();
    });
  };

  const asYear = (value: string): Filters['year'] => (value ? Number(value) : '');
  const asYearGame = (value: string): Filters['yearGame'] => (value ? Number(value) : '');
  const asString = (value: string): string => value || '';

  bindSelect(accountFilter, 'account', asString);
  bindSelect(summaryYearFilter, 'year', asYear);
  bindSelect(gameYearFilter, 'yearGame', asYearGame);
  bindSelect(gameAccountFilter, 'accountGame', asString);
  bindSelect(gameSelect, 'appidGame', asString);

  if (uploadDrop) {
    const suggestHover = (on: boolean) => {
      uploadDrop.classList.toggle('is-hovered', on);
    };
    ['dragenter', 'dragover'].forEach((evt) =>
      uploadDrop.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        suggestHover(true);
      })
    );
    ['dragleave', 'drop'].forEach((evt) =>
      uploadDrop.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (evt === 'dragleave') suggestHover(false);
      })
    );
    uploadDrop.addEventListener('drop', (e: any) => {
      suggestHover(false);
      const files = e.dataTransfer?.files;
      if (files && files.length) assignLogsFromFiles(files);
    });
    uploadDrop.addEventListener('click', () => manualPicker?.click());
    uploadDrop.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        manualPicker?.click();
      }
    });
  }
}
