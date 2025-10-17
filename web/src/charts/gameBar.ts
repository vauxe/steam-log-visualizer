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
  const desiredHeight = Math.max(320, Math.min(600, items.length * 32));
  barEl.style.height = `${desiredHeight}px`;
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
  const formatHours = (value: number) => Number(value || 0).toFixed(1);
  const option = {
    grid: { left: 180, right: 40, top: 12, bottom: 24 },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const v = params?.data?.value ?? params?.value;
        return `${params?.name}: ${formatHours(v)} h`;
      },
    },
    xAxis: {
      type: 'value',
      name: i18n?.t?.('hours') || 'Hours',
      nameLocation: 'end',
      nameGap: 16,
      axisLabel: {
        color: '#c7d5e0',
        formatter: (v: any) => formatHours(v),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: items.map((x) => x.name),
      axisLabel: {
        color: '#c7d5e0',
        formatter: (value: string) => (value.length > 32 ? `${value.slice(0, 31)}…` : value),
      },
    },
    series: [
      {
        type: 'bar',
        barWidth: 18,
        itemStyle: {
          color: '#66c0f4',
        },
        label: {
          show: true,
          position: 'right',
          color: '#c7d5e0',
          formatter: (params: any) => `${formatHours(params.value)}h`,
        },
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
