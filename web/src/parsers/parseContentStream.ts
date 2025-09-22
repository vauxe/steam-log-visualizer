import { toDate } from '../utils/format';
import { readLinesFromFile } from '../utils/stream';

const RE_APP_RUN =
  /^\[([^\]]+)\]\s*AppID\s+(\d+)\s+state changed\s*:\s*Fully Installed,App Running,/;
const RE_APP_FULLY_INSTALLED =
  /^\[([^\]]+)\]\s*AppID\s+(\d+)\s+state changed\s*:\s*Fully Installed,\s*$/;

export async function parseGameSessionsFromFile(file: File) {
  const sessions: Array<{ appid: string; start: Date; end: Date | null }> = [];
  const active = new Map<string, { start: Date; end: Date | null; appid: string }>();
  await readLinesFromFile(file, async (line) => {
    let m = line.match(RE_APP_RUN);
    if (m) {
      const ts = toDate(m[1])!;
      const app = m[2];
      if (!active.has(app)) active.set(app, { start: ts, end: null, appid: app });
      return;
    }
    m = line.match(RE_APP_FULLY_INSTALLED);
    if (m) {
      const ts = toDate(m[1])!;
      const app = m[2];
      const sess = active.get(app);
      if (sess) {
        sess.end = +ts >= +sess.start ? ts : sess.start;
        sessions.push(sess);
        active.delete(app);
      }
      return;
    }
  });
  for (const v of active.values()) sessions.push(v);
  sessions.sort((a, b) => +a.start - +b.start);
  return sessions;
}
