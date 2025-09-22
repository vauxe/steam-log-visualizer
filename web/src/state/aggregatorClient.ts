import type { AggMethod, AggRequest, AggResponse, AggMsg } from '../types/worker';

export class AggregatorClient {
  private worker: Worker;
  private seq = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (ev) => {
      const msg = (ev.data || {}) as AggMsg;
      if (msg.type !== 'res') return;
      const { id, ok, data, error } = msg as AggResponse;
      const slot = this.pending.get(id);
      if (!slot) return;
      this.pending.delete(id);
      ok ? slot.resolve(data) : slot.reject(new Error(error || 'Aggregator error'));
    };
  }

  call<K extends AggMethod>(
    method: K,
    payload: AggRequest<K>['payload']
  ): Promise<NonNullable<AggResponse<K>['data']>> {
    const id = this.seq++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const msg: AggMsg<K> = { type: 'req', id, method, payload } as AggMsg<K>;
      this.worker.postMessage(msg);
    });
  }
}
