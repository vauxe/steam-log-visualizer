export class ParseService {
  private _worker: Worker | null = null;
  private _busy = false;

  private _ensureWorker() {
    if (!this._worker) {
      this._worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), {
        type: 'module',
      });
    }
    return this._worker;
  }

  isBusy() {
    return this._busy;
  }

  async parse(connFile: File, contFile: File) {
    if (this._busy) throw new Error('Parsing in progress');
    if (!(connFile && contFile)) throw new Error('Missing files');
    this._busy = true;
    const worker = this._ensureWorker();
    return new Promise<any[]>((resolve, reject) => {
      const cleanup = () => {
        this._busy = false;
        worker.removeEventListener('message', onMsg as any);
        worker.removeEventListener('error', onErr as any);
      };
      const onErr = (e: any) => {
        cleanup();
        reject(new Error(e?.message || 'Worker error'));
      };
      const onMsg = (ev: MessageEvent) => {
        const d: any = ev.data || {};
        if (d.error) {
          cleanup();
          reject(new Error(String(d.error)));
          return;
        }
        if (d.sessions) {
          cleanup();
          resolve(d.sessions);
        }
      };
      worker.addEventListener('message', onMsg as any);
      worker.addEventListener('error', onErr as any, { once: true } as any);
      try {
        worker.postMessage({ connFile, contFile });
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  }
}

export const parseService = new ParseService();
