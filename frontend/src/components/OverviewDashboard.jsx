import KpiCardsNew from './KpiCardsNew.jsx';
import ErrorRanking from './ErrorRanking.jsx';
import SuggestionCards from './SuggestionCards.jsx';
import WeeklyFlow from './WeeklyFlow.jsx';
import StatusDonut from './commandCenter/StatusDonut.jsx';
import ThroughputTrend from './commandCenter/ThroughputTrend.jsx';
import CompletionForecast from './commandCenter/CompletionForecast.jsx';
import AutoScrollWorkorders from './AutoScrollWorkorders.jsx';
import CommentedWorkorderScroll from './CommentedWorkorderScroll.jsx';
import { Icon } from '@iconify/react';

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
  activeFilter,
  onErrorCardClick,
  focusWorkorders,
  commentedWorkorders,
  onDetailCardClick,
  onCommentClick,
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

      {/* ═══ 第二行：近14天吞吐 + 本周流转 ═══ */}
      <div className="row-c2">
        <ThroughputTrend throughputTrend={overview?.throughputTrend} />
        <WeeklyFlow stats={stats} workorders={workorders} />
      </div>

      {/* ═══ 自动滚动焦点工单 ═══ */}
      {focusWorkorders.length > 0 && (
        <AutoScrollWorkorders
          workorders={focusWorkorders}
          onCardClick={onDetailCardClick}
          onCommentClick={onCommentClick}
          autoPlay
          maxItems={20}
        />
      )}

      {/* ═══ 有评论的工单（自动滚动） ═══ */}
      {commentedWorkorders && commentedWorkorders.length > 0 && (
        <CommentedWorkorderScroll
          workorders={commentedWorkorders}
          onCommentClick={onCommentClick}
          onCardClick={onDetailCardClick}
          maxItems={30}
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

      {/* 工单明细表格 */}
      {(() => {
        const tableData =
          activeTab === 'pending' ? pendingReviewData :
          activeTab === 'rework' ? reworkData :
          activeTab === 'invalid' ? invalidData :
          displayedWorkorders;

        if (!tableData || tableData.length === 0) {
          return (
            <div className="panel" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 'var(--fs-body-sm)' }}>
              暂无匹配的工单数据
            </div>
          );
        }

        return (
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-scroll" style={{ maxHeight: 520, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th style={{ minWidth: 180 }}>问题描述</th>
                    <th style={{ width: 80 }}>年级</th>
                    <th style={{ width: 80 }}>周</th>
                    <th style={{ width: 90 }}>所属类型</th>
                    <th style={{ width: 90 }}>问题分类</th>
                    <th style={{ width: 80 }}>状态</th>
                    <th style={{ width: 80 }}>风险等级</th>
                    <th style={{ width: 80 }}>负责人</th>
                    <th style={{ width: 110 }}>最后更新</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(0, 200).map((item, idx) => (
                    <tr key={item.id || idx} className="table-row-clickable" onClick={() => onDetailCardClick?.(item)} title="点击查看详情">
                      <td className="cell-mono">{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.isUrgent && <span className="tag tag-red" style={{ fontSize: 'var(--fs-micro)', padding: '1px 5px' }}>紧急</span>}
                          {item.isRepeatedAdjustmentCandidate && <span className="tag tag-orange" style={{ fontSize: 'var(--fs-micro)', padding: '1px 5px' }}>反复</span>}
                          <span style={{
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: 220, display: 'inline-block'
                          }}>
                            {item.description || '未填写'}
                          </span>
                        </div>
                      </td>
                      <td>{item.grade || '-'}</td>
                      <td>{item.week || '-'}</td>
                      <td>{item.type || '-'}</td>
                      <td>{item.issueCategory || '-'}</td>
                      <td>
                        <span className={`status-tag status-tag-${(item.statusGroup || item.status || '').replace(/[\/\s]/g, '-')}`}>
                          {item.status || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`risk-tag risk-${item.riskLevel}`} style={{ fontSize: 'var(--fs-caption)' }}>
                          {item.riskLevel || '-'}
                        </span>
                      </td>
                      <td>{item.owner || '-'}</td>
                      <td className="cell-mono" style={{ fontSize: 'var(--fs-caption)' }}>
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tableData.length > 200 && (
              <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: 'var(--fs-caption)', borderTop: '1px solid var(--border-subtle)' }}>
                显示前 200 条，共 {tableData.length} 条
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ 第四行：预测与趋势 ═══ */}
      <CompletionForecast forecastCompletion={forecast?.forecastCompletion} />
    </div>
  );
}
