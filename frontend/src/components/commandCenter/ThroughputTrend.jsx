/**
 * Tab 1: 总览驾驶舱 — 近14日工单吞吐趋势
 */
import ReactECharts from 'echarts-for-react';
import { buildThroughputComboOption } from '../charts/commandCenterCharts.js';

export default function ThroughputTrend({ throughputTrend }) {
  const option = buildThroughputComboOption(throughputTrend || []);

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 320 }} />
    </div>
  );
}
