import ReactECharts from 'echarts-for-react';
import { baseChartOption, chartColors } from './charts/chartTheme.js';

const palette = [chartColors.blue, chartColors.purple, chartColors.cyan, chartColors.green, chartColors.orange, chartColors.red, chartColors.gray];

function getValue(item) {
  return item.value ?? item.count ?? 0;
}

function normalizeData(data = []) {
  return [...data].map((item) => ({ name: item.name || item.status || item.group || item.reason, value: getValue(item), percent: item.percent })).sort((a, b) => b.value - a.value);
}

function buildBarOption(title, data, color = chartColors.blue) {
  const visibleData = normalizeData(data).slice(0, 10);
  const safeData = visibleData.length ? visibleData : [{ name: '暂无数据', value: 0 }];
  const horizontal = safeData.length > 8;

  return {
    ...baseChartOption,
    title: { text: title, left: 0, top: 0, textStyle: { color: '#101828', fontSize: 15, fontWeight: 800 } },
    tooltip: {
      ...baseChartOption.tooltip,
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const dataItem = safeData.find((entry) => entry.name === item.name);
        return `${item.name}<br/>数量：${item.value} 条${dataItem?.percent !== undefined ? `<br/>占比：${dataItem.percent}%` : ''}`;
      }
    },
    grid: { top: 46, left: horizontal ? 132 : 32, right: 42, bottom: 28, containLabel: true },
    xAxis: horizontal ? { type: 'value', minInterval: 1, axisLabel: { color: '#64748B' }, splitLine: { lineStyle: { color: '#E2E8F0' } } } : { type: 'category', data: safeData.map((item) => item.name), axisLabel: { color: '#64748B', interval: 0, width: 90, overflow: 'truncate' }, axisTick: { show: false } },
    yAxis: horizontal ? { type: 'category', data: safeData.map((item) => item.name).reverse(), axisLabel: { color: '#64748B', width: 120, overflow: 'break' }, axisTick: { show: false } } : { type: 'value', minInterval: 1, axisLabel: { color: '#64748B' }, splitLine: { lineStyle: { color: '#E2E8F0' } } },
    series: [{ type: 'bar', data: horizontal ? safeData.map((item) => item.value).reverse() : safeData.map((item) => item.value), barMaxWidth: 28, label: { show: true, position: horizontal ? 'right' : 'top', color: '#334155', fontWeight: 700 }, itemStyle: { color, borderRadius: horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0] } }]
  };
}

function buildPieOption(title, data) {
  const safeData = normalizeData(data).slice(0, 20);
  return {
    color: palette,
    title: { text: title, left: 'center', top: 2, textStyle: { color: '#101828', fontSize: 15, fontWeight: 800 } },
    tooltip: { trigger: 'item', backgroundColor: 'rgba(15, 23, 42, 0.92)', borderWidth: 0, textStyle: { color: '#fff' }, formatter: '{b}<br/>数量：{c} 条<br/>占比：{d}%' },
    legend: { type: 'scroll', orient: 'vertical', right: 4, top: 34, bottom: 10, textStyle: { color: '#475569' } },
    series: [{ name: title, type: 'pie', radius: ['36%', '62%'], center: ['38%', '56%'], data: safeData, label: { formatter: '{b}\n{d}%', color: '#334155' }, emphasis: { itemStyle: { shadowBlur: 12, shadowOffsetX: 0, shadowColor: 'rgba(15, 23, 42, 0.24)' } } }]
  };
}

function buildRoseOption(title, data) {
  const safeData = normalizeData(data).slice(0, 8);
  return {
    color: palette,
    title: { text: title, left: 'center', top: 2, textStyle: { color: '#101828', fontSize: 15, fontWeight: 800 } },
    tooltip: { trigger: 'item', backgroundColor: 'rgba(15, 23, 42, 0.92)', borderWidth: 0, textStyle: { color: '#fff' }, formatter: '{b}<br/>数量：{c} 条<br/>占比：{d}%' },
    legend: { top: 'bottom', textStyle: { color: '#475569' } },
    series: [{ name: title, type: 'pie', radius: ['18%', '66%'], center: ['50%', '48%'], roseType: 'area', itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 }, label: { color: '#334155' }, data: safeData }]
  };
}

export default function Charts({ stats }) {
  const chartItems = [
    { title: '问题一级分类占比', option: buildPieOption('问题一级分类占比', stats.issueCategoryRanking) },
    { title: '所属类型玫瑰图', option: buildRoseOption('所属类型玫瑰图', stats.typeRanking) },
    { title: '所属类型排行', option: buildBarOption('所属类型排行', stats.typeRanking, chartColors.blue) },
    { title: '问题一级分类排行', option: buildBarOption('问题一级分类排行', stats.issueCategoryRanking, chartColors.purple) },
    { title: '年级问题分布', option: buildBarOption('年级问题分布', stats.gradeRanking, chartColors.green) },
    { title: '周次问题分布', option: buildBarOption('周次问题分布', stats.weekRanking, chartColors.cyan) }
  ];

  return (
    <section className="panel charts-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Supporting Charts</p>
          <h2>辅助分析图表</h2>
          <p className="muted">图表用于辅助查看问题类型、所属类型、年级和周次分布，核心结论以上方排行卡片为准。</p>
        </div>
      </div>
      <div className="charts-grid inner-charts-grid">
        {chartItems.map((item) => (
          <div className="chart-card compact-chart-card" key={item.title}>
            <ReactECharts option={item.option} style={{ height: 300 }} />
          </div>
        ))}
      </div>
    </section>
  );
}
