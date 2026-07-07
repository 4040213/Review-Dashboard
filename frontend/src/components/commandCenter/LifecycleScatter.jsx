/**
 * Tab 2: 深度诊断 — 处理周期稳定性散点图
 */
import ReactECharts from 'echarts-for-react';
import { Icon } from '@iconify/react';
import { buildLifecycleScatterOption } from '../charts/commandCenterCharts.js';

export default function LifecycleScatter({ lifecycle }) {
  if (!lifecycle?.data?.length) {
    return <div className="cc-chart-card"><div className="empty-state small-empty">暂无已归档工单的时间数据</div></div>;
  }

  // Check if all data has zero days (insufficient timestamp data)
  const nonZeroCount = lifecycle.data.filter(d => d.days > 0).length;
  if (nonZeroCount === 0) {
    return (
      <div className="cc-chart-card cc-span-full">
        <div className="empty-state small-empty" style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <Icon icon="mdi:chart-scatter-plot" width={40} height={40} style={{ color: "var(--text-muted)", opacity: 0.6 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-body-sm)' }}>暂无生命周期数据</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-overline)' }}>工单缺少提交时间和归档时间字段，无法计算处理周期</span>
        </div>
      </div>
    );
  }

  const option = buildLifecycleScatterOption(lifecycle);

  return (
    <div className="cc-chart-card cc-span-full">
      <ReactECharts option={option} style={{ height: 380 }} />
      <div className="cc-chart-note">
        均值：{lifecycle.mean}天 | 标准差：{lifecycle.std}天 | UCL：{lifecycle.ucl}天 | LCL：{lifecycle.lcl}天
        <br />超出控制限的点标红，表示异常长或异常短的工单周期
      </div>
    </div>
  );
}
