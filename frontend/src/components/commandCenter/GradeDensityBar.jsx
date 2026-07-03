/**
 * Tab 1: 总览驾驶舱 — 各年级工单密度横向柱状图
 */
import ReactECharts from 'echarts-for-react';
import { buildHorizontalBarOption } from '../charts/commandCenterCharts.js';
import { cmdColors } from '../charts/chartTheme.js';

export default function GradeDensityBar({ gradeDensity, allAvgDensity }) {
  const data = (gradeDensity || []).map((d) => ({
    name: d.grade,
    value: d.count,
    percent: d.avgPerWeek ? `${d.avgPerWeek}单/讲` : null
  }));

  const option = buildHorizontalBarOption('各年级工单密度', data, cmdColors.content, allAvgDensity);

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 300 }} />
      {allAvgDensity != null && (
        <div className="cc-chart-note">
          全年级平均密度：<strong>{allAvgDensity}</strong> 单/讲（虚线为均值参考线）
        </div>
      )}
    </div>
  );
}
