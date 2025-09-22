import { init, use, getInstanceByDom } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { Group } from '@types';
import { AppState } from '@state/appState';

use([
  BarChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  CanvasRenderer,
]);

export async function renderGameBarTS(groups: Group[], onSelect?: (appid: string) => void) {
  const items = groups
    .map((g) => ({
      name: g.name,
      appid: g.appid,
      sec: g.sessions.reduce((s: number, x: any) => s + (x.duration || 0), 0),
    }))
    .sort((a, b) => b.sec - a.sec);
  const barEl = document.querySelector('#topBar') as HTMLElement | null;
  if (!barEl) return;
  const chart = (getInstanceByDom(barEl) as any) || init(barEl, null, { renderer: 'canvas' });
  const i18n: any = (window as any).i18n;
  // Update label with current year suffix
  const lbl = document.getElementById('lblTopAll') as HTMLElement | null;
  if (lbl) {
    if (!(lbl as any).dataset.base) (lbl as any).dataset.base = lbl.textContent || '';
    const y = AppState.getFilter('year') as any;
    const yearText = y ? String(y) : i18n?.t?.('allYears') || 'All years';
    lbl.textContent = `${(lbl as any).dataset.base} (${yearText})`;
  }
  const option = {
    grid: { left: 40, right: 20, top: 20, bottom: 80 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const v = p && p.data && (p.data.value ?? p.value);
        const num = Number(v || 0).toFixed(2);
        return `${p.name}: ${num} h`;
      },
    },
    xAxis: {
      type: 'category',
      data: items.map((x) => x.name),
      axisLabel: { interval: 0, rotate: 30, color: '#c7d5e0' },
    },
    yAxis: {
      type: 'value',
      name: i18n?.t?.('hours') || 'Hours',
      nameLocation: 'end',
      nameGap: 12,
      axisLabel: { formatter: (v: any) => Number(v).toFixed(2) },
    },
    series: [
      {
        type: 'bar',
        data: items.map((x) => ({
          value: Number((x.sec / 3600).toFixed(2)),
          name: x.name,
          appid: x.appid,
        })),
      },
    ],
  } as const;
  chart.setOption(option as any);
  chart.off('click');
  chart.on('click', (p: any) => {
    const appid = p?.data?.appid;
    if (appid && onSelect) onSelect(appid);
  });
}
