export function applyStaticLabels(i18n: any) {
  const m = new Map<string, string>([
    ['uploadTitle', 'upload'],
    ['uploadHint', 'uploadHint'],
    ['uploadSubHint', 'uploadSubHint'],
    ['connLabel', 'connLabel'],
    ['contLabel', 'contLabel'],
    ['exportCsvBtn', 'exportCsv'],
    ['lblStatSessions', 'statSessions'],
    ['lblStatDuration', 'statDuration'],
    ['lblStatAccounts', 'statAccounts'],
    ['lblStatGames', 'statGames'],
    ['lblMonthChart', 'monthChart'],
    ['lblHourChart', 'hourChart'],
    ['lblTopAll', 'topAll'],
    ['lblTreemap', 'treemap'],
    ['lblDonut', 'donut'],
    ['lblCalHeatmap', 'calHeatmap'],
    ['lbl24x7', 'heatmap24x7'],
    ['lblTrend', 'summaryTitle'],
    ['lblGameList', 'gameList'],
    ['lblAccount', 'account'],
    ['lblFiltersYear', 'filtersYear'],
    ['lblFiltersGames', 'filtersGames'],
    ['lblSummaryYear', 'filtersYear'],
    ['lblDailyHeatmap', 'dailyHeatmap'],
    // Per-game labels
    ['lblGameAccount', 'account'],
    ['lblGameYear', 'filtersYear'],
    ['lblGameSelect', 'selectGame'],
    ['lblGameMonth', 'gameMonth'],
    ['lblGameDailyHeatmap', 'gameDailyHeatmap'],
  ]);
  for (const [id, key] of m) {
    const el = document.getElementById(id);
    if (el) {
      (el as HTMLElement).textContent = i18n.t(key as any);
    }
  }
  const search = document.getElementById('searchGame');
  if (search) {
    search.setAttribute('placeholder', i18n.t('searchPlaceholder'));
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
  highlightMatches: (q: string) => void;
}) {
  const { i18n, AppState, onRender, onHandleParse, highlightMatches } = params;
  const langSelect = document.getElementById('langSelect') as HTMLSelectElement | null;
  const titleEl = document.getElementById('title');
  if (langSelect) {
    langSelect.addEventListener('change', () => {
      i18n.setLocale(langSelect.value);
      if (titleEl) (titleEl as HTMLElement).textContent = i18n.t('appTitle');
      applyStaticLabels(i18n);
      onRender();
    });
  }

  const connLog = document.getElementById('connLog') as HTMLInputElement;
  const contLog = document.getElementById('contLog') as HTMLInputElement;
  const uploadDrop = document.getElementById('uploadDrop') as HTMLElement | null;
  const accountFilter = document.getElementById('accountFilter') as HTMLSelectElement;
  const yearFilter = document.getElementById('yearFilter') as HTMLSelectElement | null;
  const summaryYearFilter = document.getElementById(
    'summaryYearFilter'
  ) as HTMLSelectElement | null;
  const gameMulti = document.getElementById('gameMulti') as HTMLSelectElement | null;
  const gameSelect = document.getElementById('gameSelect') as HTMLSelectElement | null;
  const searchGame = document.getElementById('searchGame') as HTMLInputElement | null;
  const clearBtn = document.getElementById('clearSearchBtn') as HTMLButtonElement | null;
  const gameYearFilter = document.getElementById('gameYearFilter') as HTMLSelectElement | null;
  const gameAccountFilter = document.getElementById('gameAccountFilter') as HTMLSelectElement | null;

  const maybeAutoParse = () => {
    if (connLog.files && connLog.files[0] && contLog.files && contLog.files[0]) onHandleParse();
  };

  connLog.addEventListener('change', maybeAutoParse);
  contLog.addEventListener('change', maybeAutoParse);
  accountFilter.addEventListener('change', () => {
    AppState.setFilter('account', accountFilter.value);
    onRender();
  });
  if (yearFilter) {
    yearFilter.addEventListener('change', () => {
      const v = yearFilter.value;
      AppState.setFilter('year', v ? Number(v) : '');
      onRender();
    });
  }
  if (summaryYearFilter) {
    summaryYearFilter.addEventListener('change', () => {
      const v = summaryYearFilter.value;
      AppState.setFilter('year', v ? Number(v) : '');
      onRender();
    });
  }
  if (gameYearFilter) {
    gameYearFilter.addEventListener('change', () => {
      const v = gameYearFilter.value;
      AppState.setFilter('yearGame', v ? Number(v) : '');
      onRender();
    });
  }
  if (gameAccountFilter) {
    gameAccountFilter.addEventListener('change', () => {
      const v = gameAccountFilter.value || '';
      AppState.setFilter('accountGame', v);
      onRender();
    });
  }
  if (gameMulti) {
    gameMulti.addEventListener('change', () => {
      const selected = Array.from(gameMulti.selectedOptions).map(
        (o) => (o as HTMLOptionElement).value
      );
      AppState.setFilter('appidsIncluded', selected);
      onRender();
    });
  }
  if (gameSelect) {
    gameSelect.addEventListener('change', () => {
      const v = gameSelect.value || '';
      AppState.setFilter('appidGame', v);
      onRender();
    });
  }

  let searchTimer: any = null;
  if (searchGame) {
    searchGame.addEventListener('input', () => {
      const val = (searchGame?.value || '').trim().toLowerCase();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        AppState.setFilter('gameQuery', val);
        onRender();
        highlightMatches(val);
      }, 150);
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchGame) searchGame.value = '';
      AppState.setFilter('gameQuery', '');
      onRender();
      highlightMatches('');
    });
  }

  if (uploadDrop) {
    const suggestHover = (on: boolean) => {
      uploadDrop.style.background = on ? '#0b1220' : '#0f172a';
      uploadDrop.style.borderColor = on ? '#3b82f6' : '#334155';
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
      const files = Array.from(e.dataTransfer?.files || []) as File[];
      if (!files.length) return;
      const find = (name: string) =>
        files.find((f) => f.name.toLowerCase() === name) as File | undefined;
      const fConn =
        find('connection_log.txt') || files.find((f) => /connection[_ ]log.*\.txt$/i.test(f.name));
      const fCont =
        find('content_log.txt') || files.find((f) => /content[_ ]log.*\.txt$/i.test(f.name));
      if (fConn) {
        const dt = new DataTransfer();
        dt.items.add(fConn);
        (connLog as any).files = dt.files;
      }
      if (fCont) {
        const dt = new DataTransfer();
        dt.items.add(fCont);
        (contLog as any).files = dt.files;
      }
      maybeAutoParse();
    });
    uploadDrop.addEventListener('click', () => connLog.click());
  }
}
