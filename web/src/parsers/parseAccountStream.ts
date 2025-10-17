import { toDate } from '../utils/format';
import { readLinesFromFile } from '../utils/stream';

const RE_LOGIN =
  /^\[([^\]]+)\]\s*\[Logged On,[^\]]*\]\s*\[U:1:(\d+)\]\s*RecvMsgClientLogOnResponse\(\)\s*:\s*processing complete/;
const RE_LOG_SESSION_ENDED_VARIANTS = [
  /^\[([^\]]+)\]\s*\[Logged Off,[^\]]*\]\s*\[U:1:(\d+)\].*/, // matches "Log session ended" and other suffixes
  /^\[([^\]]+)\]\s*\[Logging Off,[^\]]*\]\s*\[U:1:(\d+)\].*/,
  /^\[([^\]]+)\]\s*\[Logged On,[^\]]*\]\s*\[U:1:(\d+)\]\s*LogOff\(\)/,
];

export async function parseAccountIntervalsFromFile(file: File) {
  const intervals: Array<{ start: Date; end: Date | null; uid: string }> = [];
  const openByUid = new Map<string, { start: Date; end: Date | null; uid: string }>();
  await readLinesFromFile(file, async (line) => {
    let m = line.match(RE_LOGIN);
    if (m) {
      const ts = toDate(m[1])!;
      const uid = m[2];
      if (!openByUid.has(uid)) openByUid.set(uid, { start: ts, end: null, uid });
      return;
    }
    for (const pattern of RE_LOG_SESSION_ENDED_VARIANTS) {
      m = line.match(pattern);
      if (!m) continue;
      const ts = toDate(m[1])!;
      const uid = m[2];
      const sess = openByUid.get(uid);
      if (sess) {
        sess.end = ts;
        intervals.push(sess);
        openByUid.delete(uid);
      }
      return;
    }
  });
  for (const v of openByUid.values()) intervals.push(v);
  intervals.sort((a, b) => +a.start - +b.start);
  return intervals;
}
