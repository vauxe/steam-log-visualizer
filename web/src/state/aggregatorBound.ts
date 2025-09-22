import type { Filters } from '@types';

import type { AggMethod, MethodPayloadMap } from '../types/worker';
import type { AggregatorClient } from './aggregatorClient';
import { aggregatorCall } from './aggregatorCall';

export const makeAggregator = (
  client: AggregatorClient,
  get: () => { sessions: any[]; filters: Filters }
) => {
  return <K extends AggMethod>(method: K, payload: MethodPayloadMap[K]) =>
    aggregatorCall(client, method, payload, get().sessions, get().filters);
};
