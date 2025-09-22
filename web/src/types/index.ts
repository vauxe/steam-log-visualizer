// Core shared types
export interface Session {
  account_id: string;
  appid: string;
  app_name?: string;
  start: Date;
  end?: Date | null;
  duration?: number | null; // seconds
}

export interface Group {
  appid: string;
  name: string;
  sessions: Session[];
}

export interface Filters {
  account: string;
  gameQuery: string;
  // Global selection (top)
  appidSelected: string;
  date: string; // YYYY-MM-DD
  dow: number | null; // 0-6
  hour: number | null; // 0-23
  year: number | '';
  // Per-game (bottom) independent filters
  accountGame: string;
  appidGame: string;
  yearGame: number | '';
  appidsIncluded: string[]; // empty means all
}

export interface DayAggregation {
  axis: string[];
  values: number[];
  map: Map<string, number>;
  years: { min: number; max: number };
  yearData?: [string, number][];
}
export type SeriesMap = { [appid: string]: Map<string | number, number> };
export type DayAndAppAggregation = { axis: string[]; mapBySeries: SeriesMap };
export type HourAggregation = { axis: number[]; values: number[]; grid: number[][] };
export type HourAndAppAggregation = {
  axis: number[];
  mapBySeries: SeriesMap;
  gridBySeries: Map<string, number[][]>;
};
export type MonthAggregation = { axis: string[]; values: number[] };
export type MonthAndAppAggregation = { axis: string[]; mapBySeries: SeriesMap };
