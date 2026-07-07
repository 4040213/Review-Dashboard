/**
 * Tab 1: 总览驾驶舱 — BHI 仪表盘
 */
import ReactECharts from 'echarts-for-react';
import { Icon } from '@iconify/react';
import { buildGaugeOption } from '../charts/commandCenterCharts.js';
import { cmdColors } from '../charts/chartTheme.js';

export default function BhiGauge({ bhi, bhiDetail }) {
  const bhiValue = bhi ?? 0;
  const hasActivity = bhiValue > 0 || (bhiDetail?.avgDailyClose7d || 0) > 0;
  const option = buildGaugeOption(bhiValue, 'BHI 看板健康指数');

  const statusIcon = bhiValue >= 0.8 ? 'mdi:check-circle' : bhiValue >= 0.6 ? 'mdi:alert-circle' : bhiValue > 0 ? 'mdi:close-circle' : 'mdi:clock-outline';
  const statusLabel = bhiValue >= 0.8 ? '健康' : bhiValue >= 0.6 ? '关注' : bhiValue > 0 ? '危险' : '数据不足';
  const statusColor = bhiValue >= 0.8 ? cmdColors.green : bhiValue >= 0.6 ? cmdColors.orange : bhiValue > 0 ? cmdColors.red : cmdColors.textSecondary;

  return (
    <div className="cc-chart-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <h3 className="cc-chart-title">BHI 看板健康指数</h3>
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: statusColor, display:'flex',alignItems:'center',gap:4 }}>
          <Icon icon={statusIcon} width={16} height={16} />
          {statusLabel}
        </span>
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
