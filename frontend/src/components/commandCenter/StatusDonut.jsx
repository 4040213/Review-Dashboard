/**
 * Tab 1: 总览驾驶舱 — 状态分布环形图（支持下钻）
 */
import ReactECharts from 'echarts-for-react';
import { buildDonutOption } from '../charts/commandCenterCharts.js';

export default function StatusDonut({ statusGroupV2, statusDetail, onDrillDown }) {
  const donutOption = buildDonutOption('工单状态分布', statusGroupV2);

  // Click handler for drill-down
  const onEvents = {
    click: (params) => {
      if (onDrillDown) {
        onDrillDown(params.name);
      }
    }
  };

  return (
    <div className="cc-chart-card">
      <ReactECharts option={donutOption} style={{ height: 240 }} onEvents={onEvents} />
      {/* Drill-down detail: show specific statuses */}
      {statusDetail && statusDetail.length > 0 && (
        <div className="cc-status-detail">
          <div className="cc-status-detail-title">具体状态明细</div>
          <div className="cc-status-detail-list">
            {statusDetail.slice(0, 8).map((s) => (
              <div key={s.status} className="cc-status-detail-item">
                <span>{s.status}</span>
                <span className="cc-status-count">{s.count}</span>
                <span className="cc-status-pct">{s.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
