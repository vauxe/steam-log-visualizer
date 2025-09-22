export function palette(i: number): string {
  const colors = [
    '#60a5fa',
    '#f472b6',
    '#34d399',
    '#f59e0b',
    '#a78bfa',
    '#22d3ee',
    '#fb7185',
    '#84cc16',
    '#e879f9',
    '#2dd4bf',
  ];
  return colors[i % colors.length];
}
