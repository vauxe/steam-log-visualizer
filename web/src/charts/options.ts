export const baseGrid = { left: 30, right: 10, top: 20, bottom: 24 };

export const createBarOption = (labels: string[], values: number[]) => ({
  grid: baseGrid,
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const p = Array.isArray(params) ? params[0] : params;
      const name = p.axisValue || p.name;
      const v = Number((p && (p.data?.value ?? p.value)) || 0);
      return `${name}: ${v.toFixed(2)} h`;
    },
  },
  xAxis: { type: 'category', data: labels },
  yAxis: { type: 'value', axisLabel: { formatter: (v: any) => Number(v).toFixed(2) } },
  series: [{ type: 'bar', data: values.map((v) => +Number(v || 0).toFixed(2)) }],
});

// Horizontal bar (value on X, categories on Y)
export const createBarOptionH = (labels: string[], values: number[]) => ({
  grid: { left: 60, right: 16, top: 20, bottom: 24 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: { type: 'value', axisLabel: { formatter: (v: any) => Number(v).toFixed(2) } },
  yAxis: { type: 'category', inverse: false, data: labels },
  series: [{ type: 'bar', data: values.map((v) => +Number(v || 0).toFixed(2)) }],
});

export const createPieOption = (data: Array<{ value: number; name: string }>) => ({
  tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: ${(p.percent || 0).toFixed(1)}%` },
  legend: { show: false },
  series: [
    {
      type: 'pie',
      radius: '75%',
      avoidLabelOverlap: true,
      label: {
        show: true,
        formatter: (p: any) => p.name,
        overflow: 'truncate',
        minMargin: 5,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: '#c7d5e0',
      },
      labelLine: { show: true, lineStyle: { color: '#8f98a0' } },
      data,
    },
  ],
});
