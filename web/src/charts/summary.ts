import { init, use, getInstanceByDom } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import { createBarOption } from './options';

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

export function renderMonthChartTS(months: number[] | null) {
  const mEl = document.querySelector('#monthChart') as HTMLElement | null;
  if (!mEl) return;
  const chart = (getInstanceByDom(mEl) as any) || init(mEl, null, { renderer: 'canvas' });
  if (!months || months.length === 0) {
    chart.clear();
    return;
  }
  const labels = [...Array(12)].map((_, i) => String(i + 1).padStart(2, '0'));
  chart.setOption(
    createBarOption(
      labels,
      months.map((v) => +(v || 0).toFixed(2))
    ) as any
  );
}
