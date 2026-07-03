/**
 * Tab 4: 预测与趋势 — Forecast & Trend
 */
import CompletionForecast from './CompletionForecast.jsx';
import EffortBubble from './EffortBubble.jsx';
import InflowOutflowArea from './InflowOutflowArea.jsx';

export default function ForecastTab({ data }) {
  if (!data) {
    return <div className="panel loading">正在加载预测数据...</div>;
  }

  return (
    <div className="cc-tab-content">
      {/* 清空预测（全宽） */}
      <CompletionForecast forecastCompletion={data.forecastCompletion} />

      {/* 气泡图 + 流入流出 */}
      <div className="cc-charts-row cc-two-col">
        <EffortBubble bubbleData={data.bubbleData} />
        <InflowOutflowArea daily30={data.daily30} />
      </div>
    </div>
  );
}
