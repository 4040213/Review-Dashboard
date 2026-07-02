import ReactECharts from 'echarts-for-react';
import { baseChartOption, chartColors } from './charts/chartTheme.js';

const palette = [chartColors.blue, chartColors.purple, chartColors.cyan, chartColors.green, chartColors.orange, chartColors.red, chartColors.gray];

function getValue(item) {
  return item.value ?? item.count ?? 0;
}

function normalizeData(data = []) {
  return [...data]
    .map((item) => ({
      name: item.name || item.status || item.group || item.reason,
      value: getValue(item),
      percent: item.percent
    }))
    .sort((a, b) => b.value - a.value);
}

// ── Donut Chart (for proportions) ──
function buildDonutOption(title, data, subtitle = '') {
  const safeData = normalizeData(data).slice(0, 15);
  return {
    color: palette,
    title: [
      { text: title, left: 'center', top: 2, textStyle: { color: '#0F172A', fontSize: 15, fontWeight: 800 } },
      { text: subtitle, left: 'center', top: 24, textStyle: { color: '#94A3B8', fontSize: 11, fontWeight: 400 } }
    ],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.88)',
      borderColor: 'rgba(255, 255, 255, 0.75)',
      borderWidth: 1,
      textStyle: { color: '#0F172A' },
      extraCssText: 'backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(37, 99, 235, 0.12);',
      formatter: '{b}<br/>数量：{c} 条<br/>占比：{d}%'
    },
    legend: { type: 'scroll', orient: 'vertical', right: 4, top: 44, bottom: 10, textStyle: { color: '#64748B', fontSize: 11 } },
    series: [{
      name: title, type: 'pie',
      radius: ['48%', '72%'],
      center: ['36%', '56%'],
      data: safeData,
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 13, fontWeight: 'bold' },
        itemStyle: { shadowBlur: 16, shadowOffsetX: 0, shadowColor: 'rgba(37, 99, 235, 0.2)' }
      },
      itemStyle: { borderColor: 'rgba(255,255,255,0.9)', borderWidth: 2, borderRadius: 4 }
    }]
  };
}

// ── Rose / Nightingale Chart ──
function buildRoseOption(title, data) {
  const safeData = normalizeData(data).slice(0, 8);
  return {
    color: palette,
    title: { text: title, left: 'center', top: 2, textStyle: { color: '#0F172A', fontSize: 15, fontWeight: 800 } },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.88)',
      borderColor: 'rgba(255, 255, 255, 0.75)',
      borderWidth: 1,
      textStyle: { color: '#0F172A' },
      extraCssText: 'backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(37, 99, 235, 0.12);',
      formatter: '{b}<br/>数量：{c} 条<br/>占比：{d}%'
    },
    legend: { top: 'bottom', textStyle: { color: '#64748B', fontSize: 11 } },
    series: [{
      name: title, type: 'pie',
      radius: ['20%', '68%'],
      center: ['50%', '46%'],
      roseType: 'area',
      itemStyle: { borderRadius: 8, borderColor: 'rgba(255,255,255,0.9)', borderWidth: 2 },
      label: { color: '#475569', fontSize: 11 },
      data: safeData
    }]
  };
}

// ── Horizontal Bar Chart (for rankings) ──
function buildHorizontalBarOption(title, data, color = chartColors.blue) {
  const visibleData = normalizeData(data).slice(0, 10);
  const safeData = visibleData.length ? visibleData : [{ name: '暂无数据', value: 0 }];

  return {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: '#0F172A', fontSize: 15, fontWeight: 800 } },
    tooltip: {
      ...baseChartOption.tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const dataItem = safeData.find((entry) => entry.name === item.name);
        return `<b>${item.name}</b><br/>数量：<b>${item.value}</b> 条${dataItem?.percent !== undefined ? `<br/>占比：${dataItem.percent}%` : ''}`;
      }
    },
    grid: { top: 40, left: 140, right: 52, bottom: 20, containLabel: true },
    xAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { color: '#94A3B8', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)', type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: safeData.map((item) => item.name).reverse(),
      axisLabel: { color: '#475569', fontSize: 12, width: 128, overflow: 'truncate' },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    series: [{
      type: 'bar',
      data: safeData.map((item) => item.value).reverse(),
      barMaxWidth: 22,
      label: { show: true, position: 'right', color: '#475569', fontWeight: 700, fontSize: 12 },
      itemStyle: { color, borderRadius: [0, 8, 8, 0] },
      emphasis: {
        itemStyle: { color, shadowBlur: 12, shadowColor: color + '40' },
        label: { fontSize: 13 }
      }
    }]
  };
}

// ── Area / Line Chart (for trends over categories like weeks) ──
function buildAreaOption(title, data, color = chartColors.cyan) {
  const visibleData = normalizeData(data).slice(0, 20);
  const safeData = visibleData.length ? visibleData : [{ name: '暂无数据', value: 0 }];
  // Sort by name for sequential data (weeks are like W1, W2, ...)
  const sorted = [...safeData].sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));

  return {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: '#0F172A', fontSize: 15, fontWeight: 800 } },
    tooltip: {
      ...baseChartOption.tooltip,
      trigger: 'axis',
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `<b>${p.axisValue}</b><br/>数量：<b>${p.value}</b> 条`;
      }
    },
    grid: { top: 46, left: 36, right: 32, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map((item) => item.name),
      axisLabel: { color: '#94A3B8', fontSize: 11, rotate: sorted.length > 12 ? 45 : 0 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } }
    },
    yAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { color: '#94A3B8', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)', type: 'dashed' } }
    },
    series: [{
      name: title, type: 'line',
      data: sorted.map((item) => item.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2.5, color },
      itemStyle: { color, borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '40' },
            { offset: 1, color: color + '05' }
          ]
        }
      },
      emphasis: {
        symbolSize: 9,
        itemStyle: { shadowBlur: 12, shadowColor: color + '60' }
      }
    }]
  };
}

// ── Vertical Bar Chart ──
function buildBarOption(title, data, color = chartColors.purple) {
  const visibleData = normalizeData(data).slice(0, 12);
  const safeData = visibleData.length ? visibleData : [{ name: '暂无数据', value: 0 }];

  return {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: '#0F172A', fontSize: 15, fontWeight: 800 } },
    tooltip: {
      ...baseChartOption.tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const dataItem = safeData.find((entry) => entry.name === item.name);
        return `<b>${item.name}</b><br/>数量：<b>${item.value}</b> 条${dataItem?.percent !== undefined ? `<br/>占比：${dataItem.percent}%` : ''}`;
      }
    },
    grid: { top: 46, left: 36, right: 32, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: safeData.map((item) => item.name),
      axisLabel: { color: '#94A3B8', fontSize: 11, interval: 0, rotate: safeData.length > 6 ? 30 : 0 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } }
    },
    yAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { color: '#94A3B8', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)', type: 'dashed' } }
    },
    series: [{
      type: 'bar',
      data: safeData.map((item) => ({
        value: item.value,
        itemStyle: {
          color,
          borderRadius: [8, 8, 0, 0]
        }
      })),
      barMaxWidth: 36,
      barGap: '30%',
      label: { show: true, position: 'top', color: '#475569', fontWeight: 700, fontSize: 12 },
      emphasis: {
        itemStyle: { color, shadowBlur: 14, shadowColor: color + '40' },
        label: { fontSize: 13 }
      }
    }]
  };
}

export default function Charts({ stats }) {
  const chartItems = [
    // 1. Donut — issue category proportion (the primary way to see category distribution)
    { title: '问题一级分类占比', option: buildDonutOption('问题一级分类占比', stats.issueCategoryRanking, '各类问题数量与比例分布'), span: 1 },
    // 2. Rose — type distribution (unique visualization)
    { title: '所属类型分布', option: buildRoseOption('所属类型分布', stats.typeRanking), span: 1 },
    // 3. Horizontal bar — high-frequency error content Top10 (main chart, most prominent)
    { title: '高频出错内容 Top10', option: buildHorizontalBarOption('高频出错内容 Top10', stats.errorContentRanking, chartColors.blue), span: 2 },
    // 4. Vertical bar — grade distribution
    { title: '年级问题分布', option: buildBarOption('年级问题分布', stats.gradeRanking, chartColors.purple), span: 1 },
    // 5. Area chart — week trend
    { title: '周次问题趋势', option: buildAreaOption('周次问题趋势', stats.weekRanking, chartColors.cyan), span: 2 },
  ];

  return (
    <section className="panel charts-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Supporting Charts</p>
          <h2>辅助分析图表</h2>
          <p className="muted">多样化图表辅助查看问题类型、高频出错内容、年级/周次分布。核心结论以左侧排行卡片为准，状态分布见上方状态概览。</p>
        </div>
      </div>
      <div className="charts-grid inner-charts-grid">
        {chartItems.map((item) => (
          <div
            className="chart-card compact-chart-card"
            key={item.title}
          >
            <ReactECharts option={item.option} style={{ height: 300 }} />
          </div>
        ))}
      </div>
    </section>
  );
}
