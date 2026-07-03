/**
 * Tab 1: 总览驾驶舱 — BHI 仪表盘
 */
import ReactECharts from 'echarts-for-react';
import { buildGaugeOption } from '../charts/commandCenterCharts.js';
import { cmdColors } from '../charts/chartTheme.js';

export default function BhiGauge({ bhi, bhiDetail }) {
  const option = buildGaugeOption(bhi ?? 0, 'BHI 看板健康指数');

  const statusLabel = bhi >= 0.8 ? '🟢 健康' : bhi >= 0.6 ? '🟡 关注' : '🔴 危险';
  const statusColor = bhi >= 0.8 ? cmdColors.green : bhi >= 0.6 ? cmdColors.orange : cmdColors.red;

  return (
    <div className="cc-chart-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <h3 className="cc-chart-title">BHI 看板健康指数</h3>
        <span style={{ fontSize: 14, fontWeight: 700, color: statusColor }}>{statusLabel}</span>
      </div>
      <ReactECharts option={option} style={{ height: 260 }} />
      {bhiDetail && (
        <div className="cc-bhi-detail">
          <div className="cc-bhi-item">
            <span>日均归档(7d)</span>
            <strong>{bhiDetail.avgDailyClose7d}</strong>
          </div>
          <div className="cc-bhi-item">
            <span>高龄比例</span>
            <strong>{Math.round((bhiDetail.agingRatio || 0) * 100)}%</strong>
          </div>
          <div className="cc-bhi-item">
            <span>返修率</span>
            <strong>{Math.round((bhiDetail.reworkRate || 0) * 100)}%</strong>
          </div>
          <div className="cc-bhi-item">
            <span>超时率</span>
            <strong>{Math.round((bhiDetail.timeoutRate || 0) * 100)}%</strong>
          </div>
        </div>
      )}
    </div>
  );
}
