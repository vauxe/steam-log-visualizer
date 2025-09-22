import {
  aggregateByLocalDay,
  aggregateByLocalDayAndApp,
  aggregateByHour,
  aggregateByHourAndApp,
  aggregateByMonth,
  aggregateByMonthAndApp,
} from '../aggregations/impl';
import type { AggMsg, AggMethod, MethodPayloadMap } from '../types/worker';

type Handler<K extends AggMethod> = (p: MethodPayloadMap[K]) => any;
const handlers: Record<AggMethod, Handler<any>> = {
  day: (p) => aggregateByLocalDay(p.sessions, (p as any).opts || {}),
  dayAndApp: (p) => aggregateByLocalDayAndApp(p.sessions),
  hour: (p) => aggregateByHour(p.sessions),
  hourAndApp: (p) => aggregateByHourAndApp(p.sessions),
  month: (p) => aggregateByMonth(p.sessions, (p as any).opts || {}),
  monthAndApp: (p) => aggregateByMonthAndApp(p.sessions),
};

self.onmessage = (ev: MessageEvent) => {
  const msg = (ev.data || {}) as AggMsg;
  if (msg.type !== 'req') return;
  const { id, method, payload } = msg;
  const send = (ok: boolean, data: any, error: string | null) =>
    (self as any).postMessage({ type: 'res', id, ok, data, error } as AggMsg);
  try {
    const handler = handlers[method as AggMethod];
    if (!handler) throw new Error('Unknown method: ' + method);
    const out = handler(payload as any);
    send(true, out, null);
  } catch (e: any) {
    send(false, null, String((e && e.message) || e));
  }
};
