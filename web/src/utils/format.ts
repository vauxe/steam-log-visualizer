export function toDate(s: string): Date | null {
  if (!s) return null;
  const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s*$/.exec(s);
  if (!m) return new Date(s.replace(' ', 'T'));
  const [_, Y, M, D, h, m2, s2] = m;
  return new Date(+Y, +M - 1, +D, +h, +m2, +s2);
}

export function fmtTs(d?: Date | null): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function dateKey(d?: Date | null): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtDur(sec?: number | null): string {
  if (sec == null || sec === ('' as any)) return '-';
  const s = +sec;
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!h && !m) parts.push(`${ss}s`);
  return parts.join(' ');
}

export function sum(a: number[]): number {
  return a.reduce((x, y) => x + y, 0);
}
export function escapeHtml(s: string): string {
  return (s || '').replace(
    /[&<>"']/g,
    (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as any)[c]
  );
}
