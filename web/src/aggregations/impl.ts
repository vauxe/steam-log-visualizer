import { dateKey } from '../utils/format';

export function aggregateByLocalDay(sessions: any[], opts: any = {}) {
  const byDay = new Map<string, number>();
  let minY = 9999,
    maxY = 0;
  sessions.forEach((s: any) => {
    const start = s.start instanceof Date ? s.start : new Date(s.start);
    const end =
      s.end instanceof Date
        ? s.end
        : s.end
          ? new Date(s.end)
          : new Date(+start + (s.duration || 0) * 1000);
    if (!start || !end) return;
    minY = Math.min(minY, start.getFullYear());
    maxY = Math.max(maxY, end.getFullYear());
    let cur = new Date(start);
    while (+cur < +end) {
      const nextDay = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      const segEnd = new Date(Math.min(+nextDay, +end));
      const hours = (+segEnd - +cur) / 3600000;
      const key = dateKey(cur);
      byDay.set(key, (byDay.get(key) || 0) + hours);
      cur = segEnd as any;
    }
  });
  const axis = Array.from(byDay.keys()).sort();
  const values = axis.map((k) => +(byDay.get(k) || 0).toFixed(2));
  const years = { min: minY, max: maxY };
  let yearData: [string, number][] | undefined = undefined;
  if (opts && opts.fillYear) {
    const yr = opts.fillYear === 'last' ? years.max || new Date().getFullYear() : +opts.fillYear;
    const set = new Map(axis.map((k, i) => [k, values[i] || 0]));
    const arr: [string, number][] = [];
    let d = new Date(yr, 0, 1);
    while (d.getFullYear() === yr) {
      const key = dateKey(d);
      const v = set.get(key) || 0;
      arr.push([key, +v.toFixed(2)]);
      d.setDate(d.getDate() + 1);
    }
    yearData = arr;
  }
  return { axis, values, map: byDay, years, yearData };
}

export function aggregateByLocalDayAndApp(sessions: any[]) {
  const datesSet = new Set<string>();
  const byApp = new Map<string, Map<string, number>>();
  sessions.forEach((s: any) => {
    const start = s.start instanceof Date ? s.start : new Date(s.start);
    const end =
      s.end instanceof Date
        ? s.end
        : s.end
          ? new Date(s.end)
          : new Date(+start + (s.duration || 0) * 1000);
    if (!start || !end) return;
    let cur = new Date(start);
    while (+cur < +end) {
      const nextDay = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      const segEnd = new Date(Math.min(+nextDay, +end));
      const hours = (+segEnd - +cur) / 3600000;
      const key = dateKey(cur);
      datesSet.add(key);
      if (!byApp.has(s.appid)) byApp.set(s.appid, new Map());
      const m = byApp.get(s.appid)!;
      m.set(key, (m.get(key) || 0) + hours);
      cur = segEnd as any;
    }
  });
  const axis = Array.from(datesSet).sort();
  const mapBySeries = Object.fromEntries(
    Array.from(byApp.entries()).map(([appid, m]) => [appid, m])
  );
  return { axis, mapBySeries };
}

export function aggregateByHour(sessions: any[]) {
  const acc = Array.from({ length: 7 }, () => Array(24).fill(0));
  sessions.forEach((s: any) => {
    const start = s.start instanceof Date ? s.start : new Date(s.start);
    const end =
      s.end instanceof Date
        ? s.end
        : s.end
          ? new Date(s.end)
          : s.duration != null
            ? new Date(+start + (s.duration || 0) * 1000)
            : start;
    if (!start || !end) return;
    let cur = new Date(start);
    const endMs = +end;
    while (+cur < endMs) {
      const dow = cur.getDay();
      const hour = cur.getHours();
      const nextHour = new Date(cur);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const segEnd = Math.min(+nextHour, endMs);
      const segHours = Math.max(0, (segEnd - +cur) / 3600000);
      if (segHours > 0) acc[dow][hour] += segHours;
      cur = new Date(segEnd);
    }
  });
  const axis = Array.from({ length: 7 * 24 }, (_, i) => i);
  const values = axis.map((i) => acc[Math.floor(i / 24)][i % 24]);
  return { axis, values, grid: acc };
}

export function aggregateByHourAndApp(sessions: any[]) {
  const byAppGrid = new Map<string, number[][]>();
  sessions.forEach((s: any) => {
    const start = s.start instanceof Date ? s.start : new Date(s.start);
    const end =
      s.end instanceof Date
        ? s.end
        : s.end
          ? new Date(s.end)
          : s.duration != null
            ? new Date(+start + (s.duration || 0) * 1000)
            : start;
    if (!start || !end) return;
    if (!byAppGrid.has(s.appid))
      byAppGrid.set(
        s.appid,
        Array.from({ length: 7 }, () => Array(24).fill(0))
      );
    const grid = byAppGrid.get(s.appid)!;
    let cur = new Date(start);
    const endMs = +end;
    while (+cur < endMs) {
      const dow = cur.getDay();
      const hour = cur.getHours();
      const nextHour = new Date(cur);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const segEnd = Math.min(+nextHour, endMs);
      const segHours = Math.max(0, (segEnd - +cur) / 3600000);
      if (segHours > 0) grid[dow][hour] += segHours;
      cur = new Date(segEnd);
    }
  });
  const axis = Array.from({ length: 7 * 24 }, (_, i) => i);
  const mapBySeries = Object.fromEntries(
    Array.from(byAppGrid.entries()).map(([appid, grid]) => {
      const values = axis.map((i) => grid[Math.floor(i / 24)][i % 24]);
      return [appid, new Map(values.map((v, i) => [i, +v.toFixed(2)]))];
    })
  );
  return { axis, mapBySeries, gridBySeries: byAppGrid };
}

export function aggregateByMonth(sessions: any[], opts: any = {}) {
  const months = new Array(12).fill(0);
  const hasYear = opts && opts.fillYear !== undefined && opts.fillYear !== null;
  const yr = hasYear
    ? opts.fillYear === 'last'
      ? new Date().getFullYear()
      : +opts.fillYear
    : null;
  const yrStart = hasYear ? new Date(yr as number, 0, 1) : null;
  const yrEnd = hasYear ? new Date((yr as number) + 1, 0, 1) : null;
  sessions.forEach((s: any) => {
    const start = s.start instanceof Date ? s.start : new Date(s.start);
    const end =
      s.end instanceof Date
        ? s.end
        : s.end
          ? new Date(s.end)
          : s.duration != null
            ? new Date(+start + (s.duration || 0) * 1000)
            : start;
    if (!start || !end) return;
    let s0 = start;
    let e0 = end;
    if (hasYear) {
      if (+e0 <= +(yrStart as Date) || +s0 >= +(yrEnd as Date)) return;
      if (+s0 < +(yrStart as Date)) s0 = yrStart as Date;
      if (+e0 > +(yrEnd as Date)) e0 = yrEnd as Date;
    }
    let cur = new Date(s0);
    const endMs = +e0;
    while (+cur < endMs) {
      const month = cur.getMonth();
      const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const segEnd = Math.min(+nextMonth, endMs);
      const segHours = Math.max(0, (segEnd - +cur) / 3600000);
      if (segHours > 0) months[month] += segHours;
      cur = new Date(segEnd);
    }
  });
  const axis = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const values = months.map((v) => +v.toFixed(2));
  return { axis, values };
}

export function aggregateByMonthAndApp(sessions: any[]) {
  const byApp = new Map<string, number[]>();
  sessions.forEach((s: any) => {
    const start = s.start instanceof Date ? s.start : new Date(s.start);
    const end =
      s.end instanceof Date
        ? s.end
        : s.end
          ? new Date(s.end)
          : s.duration != null
            ? new Date(+start + (s.duration || 0) * 1000)
            : start;
    if (!start || !end) return;
    if (!byApp.has(s.appid)) byApp.set(s.appid, new Array(12).fill(0));
    const months = byApp.get(s.appid)!;
    let cur = new Date(start);
    const endMs = +end;
    while (+cur < endMs) {
      const month = cur.getMonth();
      const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const segEnd = Math.min(+nextMonth, endMs);
      const segHours = Math.max(0, (segEnd - +cur) / 3600000);
      if (segHours > 0) months[month] += segHours;
      cur = new Date(segEnd);
    }
  });
  const axis = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const mapBySeries = Object.fromEntries(
    Array.from(byApp.entries()).map(([appid, months]) => [
      appid,
      new Map(months.map((v, i) => [axis[i], +v.toFixed(2)])),
    ])
  );
  return { axis, mapBySeries };
}
