import { parseAccountIntervalsFromFile } from '../parsers/parseAccountStream';
import { parseGameSessionsFromFile } from '../parsers/parseContentStream';
import { attributeSessionsToAccounts } from '../parsers/attribute';

self.onmessage = async (ev: MessageEvent) => {
  try {
    const { connFile, contFile } = (ev.data || {}) as any;
    if (!(connFile && contFile)) {
      (self as any).postMessage({ error: 'Missing files' });
      return;
    }
    const [accounts, games] = await Promise.all([
      parseAccountIntervalsFromFile(connFile),
      parseGameSessionsFromFile(contFile),
    ]);
    const mapped = attributeSessionsToAccounts(games, accounts);
    const list = mapped.map((s) => ({
      account_id: s.uid,
      appid: s.appid,
      app_name: '',
      start: s.start,
      end: s.end || null,
      duration: s.end ? Math.max(0, Math.floor((+s.end - +s.start) / 1000)) : null,
    }));
    list.sort((a, b) => +a.start - +b.start);
    (self as any).postMessage({ sessions: list });
  } catch (e: any) {
    (self as any).postMessage({ error: String((e && e.message) || e) });
  }
};
