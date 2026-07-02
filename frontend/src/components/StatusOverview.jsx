import ReactECharts from 'echarts-for-react';
import { baseChartOption, statusColors } from './charts/chartTheme.js';

const statusOrder = ['已归档', '待验收', '处理中', '暂停/挂起', '其他'];

function getCount(groupMap, group) {
  return groupMap.get(group)?.count || 0;
}

function getPercent(groupMap, group) {
  return groupMap.get(group)?.percent || 0;
}

function buildStatusOption(stats) {
  const groupMap = new Map((stats.statusGroupRanking || []).map((item) => [item.group || item.name, item]));

  return {
    ...baseChartOption,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.88)',
      borderColor: 'rgba(255, 255, 255, 0.75)',
      borderWidth: 1,
      textStyle: { color: '#0F172A' },
      extraCssText: 'backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-radius: 14px; box-shadow: 0 12px 32px rgba(37, 99, 235, 0.12);',
      formatter: ({ seriesName, value, color }) => `<span style="display:inline-block;margin-right:6px;border-radius:50%;width:8px;height:8px;background:${color}"></span>${seriesName}<br/>${value} 条，占比 ${getPercent(groupMap, seriesName)}%`
    },
    grid: { top: 18, left: 8, right: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', max: stats.validAnalysisCount || 1, show: false },
    yAxis: { type: 'category', data: ['状态分布'], show: false },
    series: statusOrder.map((group) => ({
      name: group,
      type: 'bar',
      stack: 'total',
      barWidth: 28,
      label: {
        show: getCount(groupMap, group) > 0,
        formatter: ({ value }) => `${value}`,
        color: '#fff',
        fontWeight: 800
      },
      itemStyle: {
        color: statusColors[group],
        borderRadius: group === '已归档' ? [999, 0, 0, 999] : group === '其他' ? [0, 999, 999, 0] : 0
      },
      data: [getCount(groupMap, group)]
    }))
  };
}

export default function StatusOverview({ stats }) {
  const groupMap = new Map((stats.statusGroupRanking || []).map((item) => [item.group || item.name, item]));

  return (
    <section className="panel status-overview-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Status Overview</p>
          <h2>工单状态概览</h2>
          <p className="muted">按当前有效分析工单统计状态分布，辅助判断待验收、处理中和暂停挂起的工单压力。</p>
        </div>
        <span className="count-badge">归档率 {stats.archiveRate ?? 0}%</span>
      </div>
      <div className="status-overview-grid">
        <div className="status-stack-card">
          <ReactECharts option={buildStatusOption(stats)} style={{ height: 92 }} />
        </div>
        <div className="status-summary-grid">
          {statusOrder.map((group) => (
            <div className="status-summary-card" key={group} style={{ '--status-color': statusColors[group] }}>
              <span>{group}</span>
              <strong>{getCount(groupMap, group)} 条</strong>
              <em>{getPercent(groupMap, group)}%</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
