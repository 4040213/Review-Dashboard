/* ═══════════════════════════════════════════════════════════════
   Chart Color Theme — 雪球课堂品牌色
   ═══════════════════════════════════════════════════════════════ */

export const chartColors = {
  blue: '#DE1020',
  cyan: '#1A8A7A',
  green: '#2D8A56',
  orange: '#D47830',
  red: '#DE1020',
  purple: '#7B3F5C',
  gray: '#A0908E',
  // Extended palette for multi-series charts
  blueLight: '#F04050',
  cyanLight: '#40B8A8',
  purpleLight: '#9B5F7C',
  greenLight: '#3BA86C',
  blueDark: '#B80D1A',
  purpleDark: '#5A2F44',
};

// 生产指挥舱品牌色规范
export const cmdColors = {
  brand: '#DE1020',
  green: '#2D8A56',
  orange: '#D47830',
  red: '#DE1020',
  content: '#7B3F5C',  // 内容制作 - 紫褐
  dev: '#DE1020',       // 研发修改 - 品牌红
  media: '#1A8A7A',     // 媒体资源 - 青绿
  other: '#A0908E',     // 其他 - 暖灰
  bg: '#FFF9F8',
  card: '#FFFFFF',
  text: '#2A1C1E',
  textSecondary: '#6B5A58'
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
  textStyle: { color: '#2A1C1E' },
  extraCssText: 'backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(222, 16, 32, 0.08); padding: 10px 14px;'
};

export const baseChartOption = {
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    textStyle: { color: '#2A1C1E', fontSize: 13 },
    extraCssText: 'backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(222, 16, 32, 0.08);'
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
    textStyle: { color: '#6B5A58' }
  }
};
