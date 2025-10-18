let _cache: Record<string, string> | null = null;
let _loadedUrl: string | null = null;

const BUNDLED_APP_LIST_URL = new URL('../../assets/data/applist.min.json', import.meta.url).href;

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

export async function loadAppList(url: string | undefined = undefined) {
  const preferred = url ?? BUNDLED_APP_LIST_URL;
  const candidates: string[] = [];
  const addCandidate = (candidate: string) => {
    if (!candidate || candidates.includes(candidate)) return;
    candidates.push(candidate);
  };

  addCandidate(preferred);

  const isAbsoluteUrl = /^(?:[a-z]+:)?\/\//i.test(preferred);
  if (!isAbsoluteUrl && !preferred.startsWith('/')) addCandidate(`/${preferred}`);
  let lastErr: any = null;
  for (const u of candidates) {
    try {
      if (_cache && _loadedUrl === u) return _cache;
      const r = await fetch(u, { cache: 'force-cache' });
      if (!r.ok) {
        lastErr = new Error(`Failed to load AppList cache: HTTP ${r.status} @ ${u}`);
        continue;
      }
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (ct && !ct.includes('json')) {
        const t = await r.text();
        lastErr = new Error(
          `Non-JSON (${ct || 'unknown'}) from ${u}, first bytes: ${t.slice(0, 60).replace(/\s+/g, ' ')}`
        );
        continue;
      }
      const j = await r.json();
      _cache = normalize(j);
      _loadedUrl = u;
      return _cache;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to load AppList cache');
}

export function resolveAppNamesFromCache(appids: string[]) {
  const out: Record<string, string> = {};
  if (!_cache) return out;
  for (const id of new Set(appids || [])) {
    out[id] = (_cache as any)[id] || '';
  }
  return out;
}
