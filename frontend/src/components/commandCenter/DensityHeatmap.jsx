/**
 * Tab 2: 深度诊断 — 年级×讲次工单密度热力图
 */
import ReactECharts from 'echarts-for-react';
import { buildHeatmapOption } from '../charts/commandCenterCharts.js';

export default function DensityHeatmap({ heatmap, onCellClick }) {
  if (!heatmap?.data?.length) {
    return <div className="cc-chart-card"><div className="empty-state small-empty">暂无热力图数据</div></div>;
  }

  const option = buildHeatmapOption(heatmap.data, heatmap.weeks, heatmap.grades);

  const onEvents = onCellClick ? {
    click: (params) => {
      const grade = heatmap.grades[params.value[1]];
      const week = heatmap.weeks[params.value[0]];
      onCellClick({ grade, week });
    }
  } : {};

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} onEvents={onEvents} />
    </div>
  );
}
