/**
 * Tab 2: 深度诊断 — 各状态停留时长箱线图
 */
import ReactECharts from 'echarts-for-react';
import { buildBoxplotOption } from '../charts/commandCenterCharts.js';

export default function DwellBoxPlot({ dwellBoxplot }) {
  const option = buildBoxplotOption(dwellBoxplot || []);

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}
