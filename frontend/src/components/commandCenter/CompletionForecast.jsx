/**
 * Tab 4: 预测与趋势 — 剩余工单清空预测
 */
import ReactECharts from 'echarts-for-react';
import { buildForecastLineOption } from '../charts/commandCenterCharts.js';
import { cmdColors } from '../charts/chartTheme.js';

export default function CompletionForecast({ forecastCompletion }) {
  if (!forecastCompletion) return null;

  const option = buildForecastLineOption(forecastCompletion);

  return (
    <div className="cc-chart-card cc-span-full">
      <ReactECharts option={option} style={{ height: 360 }} />
      <div className="cc-forecast-summary">
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
