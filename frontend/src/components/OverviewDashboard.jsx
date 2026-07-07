import KpiCardsNew from './KpiCardsNew.jsx';
import ErrorRanking from './ErrorRanking.jsx';
import SuggestionCards from './SuggestionCards.jsx';
import WeeklyFlow from './WeeklyFlow.jsx';
import StatusDonut from './commandCenter/StatusDonut.jsx';
import BhiGauge from './commandCenter/BhiGauge.jsx';
import GradeDensityBar from './commandCenter/GradeDensityBar.jsx';
import ThroughputTrend from './commandCenter/ThroughputTrend.jsx';
import CompletionForecast from './commandCenter/CompletionForecast.jsx';
import AutoScrollWorkorders from './AutoScrollWorkorders.jsx';

/**
 * 新版数据看板总览 — 按照预览设计的多面板布局
 */
export default function OverviewDashboard({
  stats,
  workorders,
  commandData,
  activeTab,
  onTabChange,
  onFilterChange,
  displayedWorkorders,
  filterState,
  onToolbarFilterChange,
  pendingReviewData,
  reworkData,
  invalidData,
  onToggleUrgent,
  activeFilter,
  onErrorCardClick,
  focusWorkorders,
  onDetailCardClick,
}) {
  const overview = commandData?.overview;
  const diagnostics = commandData?.diagnostics;
  const forecast = commandData?.forecast;

  // Build suggestions from stats
  const errorTop5 = stats.errorContentRanking?.slice(0, 5) || [];
  const unclearRate = stats.unclearRate ?? 0;
  const repeatedCount = stats.repeatedCandidateCount ?? stats.repeatedAdjustmentCandidateCount ?? 0;
  const suspendedCount = (stats.statusGroupRanking || []).find(
    (s) => (s.group || s.name) === '暂停/挂起'
  )?.count || 0;

  const suggestions = [];
  const topError = errorTop5[0];
  if (topError) {
    suggestions.push({
      title: '专项检查清单',
      body: `针对「<strong>${topError.name}</strong>」建立审核流程，<strong>${topError.count}条</strong>占比${topError.percent}%，增加公式复核步骤。`,
    });
  }
  if (unclearRate >= 20) {
    suggestions.push({
      title: '提单规范优化',
      body: `需求不明确占 <strong>${unclearRate}%</strong>，建议提单阶段要求填写验收标准 + 参考链接。`,
    });
  }
  if (repeatedCount > 0) {
    suggestions.push({
      title: '返工复盘机制',
      body: `<strong>${repeatedCount} 条</strong>反复调整工单造成返工成本，每两周复盘需求与验收口径对齐。`,
    });
  }
  if (suspendedCount > 0) {
    suggestions.push({
      title: '定期清理机制',
      body: `<strong>${suspendedCount} 条</strong>暂停/挂起工单长期未处理，建立月度清理与重新激活流程。`,
    });
  }

  return (
    <div className="content-area" style={{ paddingTop: 0 }}>
      {/* ═══ KPI 卡片 ═══ */}
      <div className="sec-header">
        <span className="sec-title">核心指标</span>
        <div className="sec-actions">
          <button className="filter-pill active">本周</button>
        </div>
      </div>
      <KpiCardsNew stats={stats} onFilterChange={onFilterChange} />

      {/* ═══ 第一行：3列 ═══ */}
      <div className="sec-header">
        <span className="sec-title">数据洞察</span>
        <span style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)' }}>点击卡片可下钻查看明细</span>
      </div>
      <div className="row-c3">
        <ErrorRanking
          items={stats.errorContentRanking || []}
          onItemClick={(item) => onErrorCardClick?.(item)}
        />
        <StatusDonut
          statusGroupV2={overview?.statusGroupV2}
          statusDetail={overview?.statusDetail}
        />
        <SuggestionCards suggestions={suggestions} />
      </div>

      {/* ═══ 第二行：7:5 ═══ */}
      <div className="row-c7-5">
        <ThroughputTrend throughputTrend={overview?.throughputTrend} />
        <div className="row-stack">
          <BhiGauge bhi={overview?.bhi} bhiDetail={overview?.bhiDetail} />
          <GradeDensityBar
            gradeDensity={overview?.gradeDensity}
            allAvgDensity={overview?.allAvgDensity}
          />
        </div>
      </div>

      {/* ═══ 自动滚动焦点工单 ═══ */}
      {focusWorkorders.length > 0 && (
        <AutoScrollWorkorders
          workorders={focusWorkorders}
          onCardClick={onDetailCardClick}
          autoPlay
          maxItems={20}
        />
      )}

      {/* ═══ 第三行：工单明细表格 ═══ */}
      <div className="sec-header">
        <span className="sec-title">工单明细</span>
        <div className="sec-actions">
          <button
            className={`filter-pill${activeTab === 'all' ? ' active' : ''}`}
            onClick={() => onTabChange('all')}
          >
            全部 {stats.validAnalysisCount ?? 0}
          </button>
          <button
            className={`filter-pill${activeTab === 'pending' ? ' active' : ''}`}
            onClick={() => onTabChange('pending')}
          >
            待验收 {pendingReviewData?.length || 0}
          </button>
          <button
            className={`filter-pill${activeTab === 'rework' ? ' active' : ''}`}
            onClick={() => onTabChange('rework')}
          >
            反复调整 {reworkData?.length || 0}
          </button>
          <button
            className={`filter-pill${activeTab === 'invalid' ? ' active' : ''}`}
            onClick={() => onTabChange('invalid')}
          >
            无效工单 {invalidData?.length || stats.invalidAnalysisCount || 0}
          </button>
        </div>
      </div>

      {/* ═══ 第四行：预测 + 流转 ═══ */}
      <div className="row-c2">
        <CompletionForecast forecastCompletion={forecast?.forecastCompletion} />
        <WeeklyFlow stats={stats} workorders={workorders} />
      </div>
    </div>
  );
}
