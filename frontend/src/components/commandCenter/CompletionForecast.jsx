/**
 * Tab 4: 预测与趋势 — 剩余工单清空预测
 */
import ReactECharts from 'echarts-for-react';
import { Icon } from '@iconify/react';
import { buildForecastLineOption } from '../charts/commandCenterCharts.js';
import { cmdColors } from '../charts/chartTheme.js';

export default function CompletionForecast({ forecastCompletion }) {
  if (!forecastCompletion || !forecastCompletion.neutral) {
    return (
      <div className="cc-chart-card cc-span-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon icon="mdi:chart-line" width={32} height={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <p style={{ fontSize: 'var(--fs-body-sm)', margin: 0 }}>暂无预测数据</p>
          <p style={{ fontSize: 'var(--fs-caption)', margin: '4px 0 0' }}>
            需从飞书同步工单（非 Excel 上传），确保工单包含时间字段
          </p>
        </div>
      </div>
    );
  }

  const option = buildForecastLineOption(forecastCompletion);
  if (!option || !option.series) return null;

  return (
    <div className="panel" style={{ padding: '16px 20px' }}>
      <div className="panel-hd" style={{ padding: '8px 0 12px' }}>
        <span className="ph-t" style={{ fontSize: '15px !important' }}>
          <span className="ph-dot" style={{ background: 'var(--brand)' }} />
          剩余工单清空预测
        </span>
        <span style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)' }}>
          还余 {forecastCompletion.remainingUnclosed} 单 · 日均归档 {forecastCompletion.avgDailyArchive7d}
        </span>
      </div>
      <ReactECharts option={option} style={{ height: 200 }} />
      <div className="cc-forecast-summary" style={{ marginTop: 6 }}>
        <div className="cc-forecast-item">
          <span style={{ color: cmdColors.green }}>乐观预测</span>
          <strong>{forecastCompletion.optimistic ? `${forecastCompletion.optimistic}天` : 'N/A'}</strong>
        </div>
        <div className="cc-forecast-item">
          <span style={{ color: cmdColors.brand }}>中性预测</span>
          <strong>{forecastCompletion.neutral ? `${forecastCompletion.neutral}天` : 'N/A'}</strong>
        </div>
        <div className="cc-forecast-item">
          <span style={{ color: cmdColors.orange }}>悲观预测</span>
          <strong>{forecastCompletion.pessimistic ? `${forecastCompletion.pessimistic}天` : 'N/A'}</strong>
        </div>
        <div className="cc-forecast-item">
          <span>日均归档(7d)</span>
          <strong>{forecastCompletion.avgDailyArchive7d}</strong>
        </div>
        <div className="cc-forecast-item">
          <span>剩余未归档</span>
          <strong>{forecastCompletion.remainingUnclosed}</strong>
        </div>
        {forecastCompletion.deadlineDate && (
          <div className="cc-forecast-item">
            <span style={{ color: cmdColors.red }}>上线截止日</span>
            <strong>{forecastCompletion.deadlineDate}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
