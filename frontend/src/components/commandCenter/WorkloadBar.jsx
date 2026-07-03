/**
 * Tab 2: 深度诊断 — 各教研负责人负载柱状图
 */
import ReactECharts from 'echarts-for-react';
import { buildWorkloadBarOption } from '../charts/commandCenterCharts.js';

export default function WorkloadBar({ workloadData, avgWorkload, onResearcherClick }) {
  const option = buildWorkloadBarOption(workloadData || [], avgWorkload || 0);

  const onEvents = onResearcherClick ? {
    click: (params) => {
      if (params.name) onResearcherClick(params.name);
    }
  } : {};

  return (
    <div className="cc-chart-card">
      <ReactECharts option={option} style={{ height: 360 }} onEvents={onEvents} />
      {/* 平均处理周期表格 */}
      {workloadData && workloadData.length > 0 && (
        <div className="cc-workload-table">
          <div className="cc-workload-header">
            <span>负责人</span><span>平均处理周期</span><span>总工单</span>
          </div>
          {workloadData.slice(0, 8).map((r) => (
            <div key={r.name} className="cc-workload-row">
              <span>{r.name}</span>
              <span>{r.avgCycle != null ? `${r.avgCycle}天` : '-'}</span>
              <span>{r.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
