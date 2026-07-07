/**
 * Tab 4: 预测与趋势 — 各类型剩余工作量气泡图
 */
import ReactECharts from 'echarts-for-react';
import { buildBubbleOption } from '../charts/commandCenterCharts.js';

export default function EffortBubble({ bubbleData }) {
  // Check if there's any meaningful data to render
  const hasData = (bubbleData || []).some(d => (d.remaining || 0) > 0 || (d.avgDays || 0) > 0);

  if (!hasData) {
    return (
      <div className="cc-chart-card">
        <div className="empty-state small-empty" style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 32 }}>🫧</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-body-sm)' }}>暂无剩余工作量数据</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-overline)' }}>无可计算的剩余人天数据</span>
        </div>
      </div>
    );
  }

  const option = buildBubbleOption(bubbleData || []);

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 340 }} />
    </div>
  );
}
