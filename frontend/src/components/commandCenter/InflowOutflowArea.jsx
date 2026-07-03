/**
 * Tab 4: 预测与趋势 — 工单流入流出平衡面积图
 */
import ReactECharts from 'echarts-for-react';
import { buildAreaCompareOption } from '../charts/commandCenterCharts.js';

export default function InflowOutflowArea({ daily30 }) {
  const option = buildAreaCompareOption(daily30 || []);

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}
