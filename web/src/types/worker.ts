import type {
  DayAggregation,
  DayAndAppAggregation,
  HourAggregation,
  HourAndAppAggregation,
  MonthAggregation,
  MonthAndAppAggregation,
  Session,
} from './index';

export type AggMethod = 'day' | 'dayAndApp' | 'hour' | 'hourAndApp' | 'month' | 'monthAndApp';

export interface MethodPayloadMap {
  day: { sessions: Session[]; opts?: { fillYear?: 'last' | number } };
  dayAndApp: { sessions: Session[] };
  hour: { sessions: Session[] };
  hourAndApp: { sessions: Session[] };
  month: { sessions: Session[]; opts?: { fillYear?: 'last' | number } };
  monthAndApp: { sessions: Session[] };
}

export interface MethodResultMap {
  day: DayAggregation;
  dayAndApp: DayAndAppAggregation;
  hour: HourAggregation;
  hourAndApp: HourAndAppAggregation;
  month: MonthAggregation;
  monthAndApp: MonthAndAppAggregation;
}

export type AggRequest<K extends AggMethod = AggMethod> = {
  id: number;
  method: K;
  payload: MethodPayloadMap[K];
};
export type AggResponse<K extends AggMethod = AggMethod> = {
  id: number;
  ok: boolean;
  data?: MethodResultMap[K];
  error?: string;
};

export type AggMsg<K extends AggMethod = AggMethod> =
  | ({ type: 'req' } & AggRequest<K>)
  | ({ type: 'res' } & AggResponse<K>);
