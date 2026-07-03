/**
 * Tab 2: 深度诊断 — 处理周期稳定性散点图
 */
import ReactECharts from 'echarts-for-react';
import { buildLifecycleScatterOption } from '../charts/commandCenterCharts.js';

export default function LifecycleScatter({ lifecycle }) {
  if (!lifecycle?.data?.length) {
    return <div className="cc-chart-card"><div className="empty-state small-empty">暂无已归档工单的时间数据</div></div>;
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
