export function attributeSessionsToAccounts(
  games: Array<{ appid: string; start: Date; end?: Date | null }>,
  accounts: Array<{ uid: string; start: Date; end?: Date | null }>
) {
  if (!games.length)
    return [] as Array<{ uid: string; appid: string; start: Date; end: Date | null }>;
  const gSorted = games.slice().sort((a, b) => +a.start - +b.start);
  const aSorted = accounts.slice().sort((a, b) => +a.start - +b.start);
  const out: Array<{ uid: string; appid: string; start: Date; end: Date | null }> = [];
  let i = 0;
  const n = aSorted.length;
  for (const g of gSorted) {
    while (i < n) {
      const iv = aSorted[i];
      if (iv.end && +iv.end < +g.start) {
        i++;
        continue;
      }
      break;
    }
    let uid = 'UNKNOWN';
    if (i < n) {
      const iv = aSorted[i];
      if (!iv.end || +g.start >= +iv.start) {
        uid = iv.uid;
      }
    }
    out.push({ uid, appid: g.appid, start: g.start, end: g.end || null });
  }
  out.sort((a, b) => +a.start - +b.start);
  return out;
}
