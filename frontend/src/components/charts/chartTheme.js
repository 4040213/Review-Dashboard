export const chartColors = {
  blue: '#2563EB',
  cyan: '#06B6D4',
  green: '#10B981',
  orange: '#F59E0B',
  red: '#F43F5E',
  purple: '#7C3AED',
  gray: '#94A3B8',
  // Extended palette for multi-series charts
  blueLight: '#60A5FA',
  cyanLight: '#22D3EE',
  purpleLight: '#A78BFA',
  greenLight: '#34D399',
  blueDark: '#1D4ED8',
  purpleDark: '#6D28D9',
};

export const statusColors = {
  已归档: chartColors.green,
  待验收: chartColors.blue,
  处理中: chartColors.orange,
  '暂停/挂起': chartColors.gray,
  其他: chartColors.gray
};

// Glassmorphism tooltip style
export const glassTooltip = {
  backgroundColor: 'rgba(255, 255, 255, 0.88)',
  borderColor: 'rgba(255, 255, 255, 0.75)',
  borderWidth: 1,
  textStyle: { color: '#0F172A' },
  extraCssText: 'backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(37, 99, 235, 0.12); padding: 10px 14px;'
};

export const baseChartOption = {
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    textStyle: { color: '#0F172A', fontSize: 13 },
    extraCssText: 'backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(37, 99, 235, 0.12);'
  },
  grid: {
    top: 40,
    left: 32,
    right: 32,
    bottom: 40,
    containLabel: true
  },
  legend: {
    top: 0,
    textStyle: { color: '#64748B' }
  }
};
