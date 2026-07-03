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

// 生产指挥舱品牌色规范
export const cmdColors = {
  brand: '#2B5FD7',
  green: '#00A86B',
  orange: '#F5A623',
  red: '#E74C3C',
  content: '#8E44AD',  // 内容制作 - 紫色
  dev: '#3498DB',       // 研发修改 - 蓝色
  media: '#2ECC71',     // 媒体资源 - 翠绿
  other: '#95A5A6',     // 其他 - 灰色
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#2C3E50',
  textSecondary: '#7F8C8D'
};

export const statusColors = {
  已归档: chartColors.green,
  待验收: chartColors.blue,
  处理中: chartColors.orange,
  '暂停/挂起': chartColors.gray,
  其他: chartColors.gray
};

// 新版状态分组颜色
export const statusGroupV2Colors = {
  '已关闭': cmdColors.green,
  '未关闭': cmdColors.red,
  '进行中': cmdColors.orange
};

// 类型大类颜色
export const typeCategoryColors = {
  '内容制作': cmdColors.content,
  '研发修改': cmdColors.dev,
  '媒体资源': cmdColors.media,
  '其他': cmdColors.other
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
