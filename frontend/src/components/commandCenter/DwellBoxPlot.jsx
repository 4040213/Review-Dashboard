/**
 * Tab 2: 深度诊断 — 各状态停留时长箱线图
 */
import ReactECharts from 'echarts-for-react';
import { Icon } from '@iconify/react';
import { buildBoxplotOption } from '../charts/commandCenterCharts.js';

export default function DwellBoxPlot({ dwellBoxplot }) {
  // Filter out entries where all boxplot values are zero (no meaningful box to render)
  const validData = (dwellBoxplot || []).filter(d => !(d.min === 0 && d.q1 === 0 && d.median === 0 && d.q3 === 0 && d.max === 0));
  // Also check if remaining data has any variation (min !== max) to render visible boxes
  const hasVisibleBoxes = validData.some(d => d.min !== d.max);

  if (!validData.length || !hasVisibleBoxes) {
    return (
      <div className="cc-chart-card">
        <div className="empty-state small-empty" style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <Icon icon="mdi:chart-box-outline" width={40} height={40} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-body-sm)' }}>暂无停留时长数据</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-overline)' }}>工单缺少时间戳字段（submittedAt/resolvedAt），无法绘制箱线图</span>
        </div>
      </div>
    );
  }

  const option = buildBoxplotOption(validData);

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}
