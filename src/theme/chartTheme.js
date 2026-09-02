/* Recharts needs concrete colour strings (CSS vars holding RGB triplets can't
 * be used directly in SVG attributes), so the chart palette is resolved here
 * from the active theme and passed into the chart components. */

export const chartTheme = {
  light: {
    line: '#286861',
    gradientTop: 'rgba(40, 104, 97, 0.22)',
    gradientBottom: 'rgba(40, 104, 97, 0)',
    grid: 'rgba(117, 120, 116, 0.18)',
    axis: '#444844',
    dot: '#286861',
    dotStroke: '#ffffff',
    tooltipBg: '#ffffff',
    tooltipBorder: '#c5c7c2',
    tooltipText: '#111d27',
    cursor: 'rgba(40, 104, 97, 0.10)',
  },
  dark: {
    line: '#93d2c9',
    gradientTop: 'rgba(147, 210, 201, 0.28)',
    gradientBottom: 'rgba(147, 210, 201, 0)',
    grid: 'rgba(143, 145, 140, 0.18)',
    axis: '#c5c7c1',
    dot: '#93d2c9',
    dotStroke: '#040f19',
    tooltipBg: '#15212b',
    tooltipBorder: '#454843',
    tooltipText: '#d7e4f2',
    cursor: 'rgba(147, 210, 201, 0.12)',
  },
};

export function getChartTheme(mode) {
  return chartTheme[mode] || chartTheme.light;
}
