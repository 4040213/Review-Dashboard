/**
 * Tab 1: 总览驾驶舱 — Executive Dashboard
 */
import KpiCards from './KpiCards.jsx';
import BhiGauge from './BhiGauge.jsx';
import StatusDonut from './StatusDonut.jsx';
import GradeDensityBar from './GradeDensityBar.jsx';
import ThroughputTrend from './ThroughputTrend.jsx';

export default function OverviewTab({ data }) {
  if (!data) {
    return <div className="panel loading">正在加载总览数据...</div>;
  }

  return (
    <div className="cc-tab-content">
      {/* KPI 指标卡 */}
      <KpiCards kpis={data.kpis} />

      {/* 中部：环形图 + BHI仪表盘 */}
      <div className="cc-charts-row cc-two-col">
        <StatusDonut
          statusGroupV2={data.statusGroupV2}
          statusDetail={data.statusDetail}
        />
        <BhiGauge bhi={data.bhi} bhiDetail={data.bhiDetail} />
      </div>

      {/* 底部：年级密度 + 吞吐趋势 */}
      <div className="cc-charts-row cc-two-col">
        <GradeDensityBar
          gradeDensity={data.gradeDensity}
          allAvgDensity={data.allAvgDensity}
        />
        <ThroughputTrend throughputTrend={data.throughputTrend} />
      </div>
    </div>
  );
}
