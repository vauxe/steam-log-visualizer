import { init, use, getInstanceByDom } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { AppState } from '@state/appState';


import { createBarOption } from './options';

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

export async function renderMonthChartTS(months: number[]) {
  const mEl = document.querySelector('#monthChart') as HTMLElement | null;
  if (!mEl) return;
  const chart = (getInstanceByDom(mEl) as any) || init(mEl, null, { renderer: 'canvas' });
  const i18n: any = (window as any).i18n;
  const lbl = document.getElementById('lblMonthChart') as HTMLElement | null;
  if (lbl) {
    if (!(lbl as any).dataset.base) (lbl as any).dataset.base = lbl.textContent || '';
    const y = AppState.getFilter('year') as any;
    const yearText = y ? String(y) : i18n?.t?.('allYears') || 'All years';
    lbl.textContent = `${(lbl as any).dataset.base} (${yearText})`;
  }
  const labels = [...Array(12)].map((_, i) => String(i + 1).padStart(2, '0'));
  chart.setOption(
    createBarOption(
      labels,
      months.map((v) => +(v || 0).toFixed(2))
    ) as any
  );
}
