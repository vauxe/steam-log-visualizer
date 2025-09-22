export function sessionsHash(sessions: any[]): string {
  if (!sessions || !sessions.length) return '0';
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const seed = `${sessions.length}|${+first.start}|${+last.start}`;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16);
}
