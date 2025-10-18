let _cache: Record<string, string> | null = null;
let _pendingLoad: Promise<Record<string, string>> | null = null;

const PUBLIC_APP_LIST_PATH = 'data/applist.min.json';

function resolveBundledAppListUrl() {
  const base = (import.meta.env.BASE_URL || '/').trim();
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  if (typeof window !== 'undefined') {
    return new URL(PUBLIC_APP_LIST_PATH, new URL(normalizedBase, window.location.href)).href;
  }
  return `${normalizedBase}${PUBLIC_APP_LIST_PATH}`;
}

function normalize(json: any) {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    if (json.applist && Array.isArray(json.applist.apps)) {
      const out: Record<string, string> = {};
      for (const a of json.applist.apps) {
        if (a && a.appid != null) out[String(a.appid)] = a.name || '';
      }
      return out;
    }
    const keys = Object.keys(json);
    const looksMapping = keys.length && typeof (json as any)[keys[0]] === 'string';
    if (looksMapping) return json as Record<string, string>;
  }
  return {} as Record<string, string>;
}

export async function loadAppList(url?: string) {
  if (_cache) return _cache;
  if (_pendingLoad) return _pendingLoad;

  const targetUrl = url || resolveBundledAppListUrl();

  _pendingLoad = (async () => {
    const r = await fetch(targetUrl, { cache: 'force-cache' });
    if (!r.ok) throw new Error(`Failed to load AppList cache: HTTP ${r.status} @ ${targetUrl}`);
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (ct && !ct.includes('json')) {
      const t = await r.text();
      throw new Error(
        `Non-JSON (${ct || 'unknown'}) from ${targetUrl}, first bytes: ${t.slice(0, 60).replace(/\s+/g, ' ')}`
      );
    }
    const j = await r.json();
    _cache = normalize(j);
    return _cache;
  })();

  try {
    return await _pendingLoad;
  } finally {
    _pendingLoad = null;
  }
}

export function resolveAppNamesFromCache(appids: string[]) {
  const out: Record<string, string> = {};
  if (!_cache) return out;
  for (const id of new Set(appids || [])) {
    out[id] = (_cache as any)[id] || '';
  }
  return out;
}
