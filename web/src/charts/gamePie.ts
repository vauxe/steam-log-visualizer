import { init, use, getInstanceByDom } from 'echarts/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { Group } from '@types';
import { AppState } from '@state/appState';

import { createPieOption } from './options';

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer]);

export async function renderGamePieTS(groups: Group[], onSelect?: (appid: string) => void) {
  const items = groups
    .map((g) => ({
      name: g.name,
      appid: g.appid,
      sec: g.sessions.reduce((s: number, x: any) => s + (x.duration || 0), 0),
    }))
    .sort((a, b) => b.sec - a.sec);
  const donutEl = document.querySelector('#donutWrap') as HTMLElement | null;
  if (!donutEl) return;
  const chart = (getInstanceByDom(donutEl) as any) || init(donutEl, null, { renderer: 'canvas' });
  const i18n: any = (window as any).i18n;
  const lbl = document.getElementById('lblDonut') as HTMLElement | null;
  if (lbl) {
    if (!(lbl as any).dataset.base) (lbl as any).dataset.base = lbl.textContent || '';
    const y = AppState.getFilter('year') as any;
    const yearText = y ? String(y) : i18n?.t?.('allYears') || 'All years';
    lbl.textContent = `${(lbl as any).dataset.base} (${yearText})`;
  }
  const data = items.map((x) => ({ value: x.sec, name: x.name, appid: x.appid }));
  const option = createPieOption(data);
  chart.setOption(option as any);
  chart.off('click');
  chart.on('click', (p: any) => {
    const appid = p?.data?.appid;
    if (appid && onSelect) onSelect(appid);
  });
}
