/**
 * Tab 4: 预测与趋势 — 工单流入流出平衡面积图
 */
import ReactECharts from 'echarts-for-react';
import { Icon } from '@iconify/react';
import { buildAreaCompareOption } from '../charts/commandCenterCharts.js';

export default function InflowOutflowArea({ daily30 }) {
  // Check if there's any daily flow data (not just cumulative)
  const hasFlow = (daily30 || []).some(d => (d.newCount || 0) > 0 || (d.archivedCount || 0) > 0);

  if (!hasFlow) {
    return (
      <div className="cc-chart-card">
        <div className="empty-state small-empty" style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <Icon icon="mdi:chart-areaspline" width={40} height={40} style={{ color: "var(--text-muted)", opacity: 0.6 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-body-sm)' }}>暂无流入流出数据</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-overline)' }}>工单缺少提交/归档时间字段，无法统计每日流入流出</span>
        </div>
      </div>
    );
  }

  const option = buildAreaCompareOption(daily30 || []);

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}
