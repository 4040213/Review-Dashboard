export const chartColors = {
  blue: '#2563EB',
  cyan: '#06B6D4',
  green: '#10B981',
  orange: '#F59E0B',
  red: '#EF4444',
  purple: '#7C3AED',
  gray: '#94A3B8'
};

export const statusColors = {
  已归档: chartColors.green,
  待验收: chartColors.blue,
  处理中: chartColors.orange,
  '暂停/挂起': chartColors.red,
  其他: chartColors.gray
};

export const baseChartOption = {
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 0,
    textStyle: { color: '#fff' }
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
    textStyle: { color: '#475569' }
  }
};
