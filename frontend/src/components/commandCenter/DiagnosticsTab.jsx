/**
 * Tab 2: 深度诊断 — Deep Dive Analytics
 */
import DwellBoxPlot from './DwellBoxPlot.jsx';
import DensityHeatmap from './DensityHeatmap.jsx';
import TypeStackedBar from './TypeStackedBar.jsx';
import WorkloadBar from './WorkloadBar.jsx';
import LifecycleScatter from './LifecycleScatter.jsx';

export default function DiagnosticsTab({ data, onCellClick, onResearcherClick }) {
  if (!data) {
    return <div className="panel loading">正在加载诊断数据...</div>;
  }

  return (
    <div className="cc-tab-content">
      {/* 第一行：箱线图 + 热力图 */}
      <div className="cc-charts-row cc-two-col">
        <DwellBoxPlot dwellBoxplot={data.dwellBoxplot} />
        <DensityHeatmap heatmap={data.heatmap} onCellClick={onCellClick} />
      </div>

      {/* 第二行：堆积图 + 负载图 */}
      <div className="cc-charts-row cc-two-col">
        <TypeStackedBar
          stackedTypeData={data.stackedTypeData}
          typeCategories={data.typeCategories}
        />
        <WorkloadBar
          workloadData={data.workloadData}
          avgWorkload={data.avgWorkload}
          onResearcherClick={onResearcherClick}
        />
      </div>

      {/* 第三行：生命周期散点图（全宽） */}
      <LifecycleScatter lifecycle={data.lifecycle} />
    </div>
  );
}
