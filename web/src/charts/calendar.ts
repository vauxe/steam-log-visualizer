import { init, use, getInstanceByDom } from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import { CalendarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
use([HeatmapChart, CalendarComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

export function renderCalendarHeatmapTS(
  el: HTMLElement | null,
  year: number | null,
  data: [string, number][]
) {
  if (!el) return;
  const chart = (getInstanceByDom(el) as any) || init(el, null, { renderer: 'canvas' });
  if (!year) {
    chart.clear();
    return;
  }

  const width = el.clientWidth || el.getBoundingClientRect().width || 600;
  const cell = Math.max(8, Math.floor((width - 40) / 53));
  if (!el.style.height) el.style.height = cell * 7 + 40 + 'px';
  const dataset = data || [];
  if (!dataset.length) {
    chart.clear();
    return;
  }
  const maxv = Math.max(0.1, ...dataset.map((d) => d[1]));

  chart.setOption({
    tooltip: {
      show: true,
      formatter: (p: any) => {
        const arr = Array.isArray(p.data) ? p.data : Array.isArray(p.value) ? p.value : null;
        const dateStr = arr ? arr[0] : '';
        const vRaw = arr ? arr[1] : 0;
        const v = Number(vRaw || 0);
        return `${dateStr}<br/>${v} h`;
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: maxv,
      inRange: { color: ['#0b1220', '#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'] },
    },
    calendar: {
      top: 28,
      left: 20,
      right: 20,
      cellSize: [cell, cell],
      range: String(year),
      itemStyle: { borderColor: '#0b1220' },
      splitLine: { lineStyle: { color: '#0b1220' } },
      dayLabel: { color: '#94a3b8' },
      monthLabel: { color: '#94a3b8' },
      yearLabel: { color: '#94a3b8' },
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: dataset,
        itemStyle: { borderRadius: 3, borderWidth: 2, borderColor: '#0b1220' },
      },
    ],
  });
  chart.off('click');
}
