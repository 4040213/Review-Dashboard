/**
 * Tab 4: 预测与趋势 — 各类型剩余工作量气泡图
 */
import ReactECharts from 'echarts-for-react';
import { buildBubbleOption } from '../charts/commandCenterCharts.js';

export default function EffortBubble({ bubbleData }) {
  const option = buildBubbleOption(bubbleData || []);

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}
