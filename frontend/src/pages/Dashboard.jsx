import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFeishuStatus, getHealth, getSources, getStats, getWorkorders, syncFeishu, getCommandAll } from '../api/workorders.js';
import AutoScrollWorkorders from '../components/AutoScrollWorkorders.jsx';
import Charts from '../components/Charts.jsx';
import ClassificationPanel from '../components/ClassificationPanel.jsx';
import DataSourceBar from '../components/DataSourceBar.jsx';
import LeftConclusionPanel from '../components/LeftConclusionPanel.jsx';
import RightDataPanel from '../components/RightDataPanel.jsx';
import StatsCards from '../components/StatsCards.jsx';
import TimeAnalysis from '../components/TimeAnalysis.jsx';
import UploadExcel from '../components/UploadExcel.jsx';
import ErrorDetailModal from '../components/ErrorDetailModal.jsx';
import WorkorderDetailModal from '../components/WorkorderDetailModal.jsx';
import TabNavigation from '../components/TabNavigation.jsx';
import OverviewTab from '../components/commandCenter/OverviewTab.jsx';
import DiagnosticsTab from '../components/commandCenter/DiagnosticsTab.jsx';
import TaskListTab from '../components/commandCenter/TaskListTab.jsx';
import ForecastTab from '../components/commandCenter/ForecastTab.jsx';
import { downloadReviewReport } from '../utils/report.js';

const emptyStats = {
  totalRawCount: 0,
  totalCount: 0,
  validAnalysisCount: 0,
  invalidAnalysisCount: 0,
  unfinishedCount: 0,
  archivedCount: 0,
  archiveRate: 0,
  completionRate: 0,
  unclearCount: 0,
  unclearRate: 0,
  highRiskCount: 0,
  repeatedCandidateCount: 0,
  repeatedAdjustmentCandidateCount: 0,
  repeatedAdjustmentRate: 0,
  classificationWarning: '',
  typeRanking: [],
  issueCategoryRanking: [],
  unclearReasonRanking: [],
  repeatedAdjustmentRanking: [],
  errorContentRanking: [],
  statusRanking: [],
  statusGroupRanking: [],
  gradeRanking: [],
  weekRanking: [],
  focusWorkorders: [],
  typicalCases: { highRiskCases: [], unclearCases: [], repeatedAdjustmentCases: [] },
  timeTrend: [],
  durationStats: [],
  pendingDurationRanking: [],
  hasTimeAnalysisData: false,
  invalidReasonRanking: [],
  passRate: null,
  passTotal: 0
};

const defaultFilterState = {
  scope: 'valid',
  excludedStatuses: ['暂停/挂起'],
  excludedInvalidTypes: ['collaboration_placeholder', 'test_data', 'blank', 'incomplete'],
  keyword: ''
};

export default function Dashboard() {
  const [workorders, setWorkorders] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [health, setHealth] = useState('连接中');
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState([]);
  const [sourceId, setSourceId] = useState('summer_2026');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [feishuStatus, setFeishuStatus] = useState(null);
  const [syncMessage, setSyncMessage] = useState('');

  // Phase 1A new state
  const [activeFilter, setActiveFilter] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filterState, setFilterState] = useState(defaultFilterState);
  const [bottomExpanded, setBottomExpanded] = useState(false);
  const [showClassificationPanel, setShowClassificationPanel] = useState(false);
  const [dataSourceExpanded, setDataSourceExpanded] = useState(false);

  // Detail modal state
  const [detailWorkorder, setDetailWorkorder] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  // ── 生产指挥舱状态 ──
  const [activeCommandTab, setActiveCommandTab] = useState('overview');
  const [commandData, setCommandData] = useState(null);
  const [viewMode, setViewMode] = useState('legacy'); // 'command' | 'legacy'

  async function loadDashboardData(nextSourceId = sourceId) {
    if (!nextSourceId) return;
    setLoading(true);
    try {
      const [workordersResult, statsResult] = await Promise.all([
        getWorkorders(nextSourceId),
        getStats(nextSourceId)
      ]);
      const loadedWorkorders = workordersResult.workorders || [];
      const loadedStats = { ...emptyStats, ...(statsResult || {}) };
      setWorkorders(loadedWorkorders);
      setStats(loadedStats);
      // Auto-adjust filter: if no valid data but has invalid, show all
      if ((loadedStats.validAnalysisCount ?? 0) === 0 && (loadedStats.invalidAnalysisCount ?? 0) > 0) {
        setFilterState((prev) => ({ ...prev, scope: 'all' }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // 加载指挥舱数据
  async function loadCommandData(nextSourceId) {
    if (!nextSourceId) return;
    try {
      const data = await getCommandAll(nextSourceId);
      setCommandData(data);
    } catch (error) {
      console.error('Failed to load command center data:', error);
    }
  }

  function applySyncResult(result) {
    setWorkorders(result.workorders || []);
    setStats({ ...emptyStats, ...(result.stats || {}) });
    setLastSyncedAt(result.syncedAt || new Date().toISOString());
    // Auto-adjust filter: if no valid data but has invalid, show all
    const stats = result.stats || {};
    if ((stats.validAnalysisCount ?? 0) === 0 && (stats.invalidAnalysisCount ?? 0) > 0) {
      setFilterState((prev) => ({ ...prev, scope: 'all' }));
    }
  }

  async function handleManualSync() {
    if (!sourceId) return;
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await syncFeishu(sourceId);
      applySyncResult(result);
      setSyncMessage(`同步成功：${result.message || '已同步最新数据'}`);
    } catch (error) {
      const message = error.message || '飞书同步失败';
      setSyncMessage(`同步失败：${message}`);
    } finally {
      setSyncing(false);
    }
  }

  function handleUploaded(result) {
    setWorkorders(result.workorders || []);
    setStats({ ...emptyStats, ...(result.stats || {}) });
    setLastSyncedAt(new Date().toISOString());
    // Auto-adjust filter: if no valid data but has invalid, show all
    const stats = result.stats || {};
    if ((stats.validAnalysisCount ?? 0) === 0 && (stats.invalidAnalysisCount ?? 0) > 0) {
      setFilterState((prev) => ({ ...prev, scope: 'all' }));
    }
    // 刷新指挥舱数据
    if (sourceId) loadCommandData(sourceId);
  }

  function handleReanalyzed(result) {
    if (result?.workorders) {
      setWorkorders(result.workorders);
    }
    if (result?.stats) {
      setStats({ ...emptyStats, ...result.stats });
    }
    // 刷新指挥舱数据
    if (sourceId) loadCommandData(sourceId);
  }

  // ── 指挥舱交互处理 ──

  function handleHeatmapCellClick({ grade, week }) {
    // 从热力图点击→跳转到Tab 3并筛选
    setActiveCommandTab('tasklist');
  }

  function handleResearcherClick(name) {
    // 从负载图点击→跳转到Tab 3并筛选
    setActiveCommandTab('tasklist');
  }

  function handleStatusDrillDown(group) {
    // 状态环形图下钻
    // 可在此处理下钻逻辑
  }

  // 计算Tab徽章数
  const tabBadgeCounts = useMemo(() => ({
    tasklist: commandData?.tasklist?.workorders?.filter((w) => w.statusGroupV2 !== '已关闭').length || 0
  }), [commandData]);

  // Handle filter changes from LeftConclusionPanel and FilterToolbar
  const handleFilterChange = useCallback((newFilter) => {
    setActiveFilter(newFilter);
    // When a left-side conclusion item is clicked, switch to 'all' tab to show filtered data
    if (newFilter && activeTab !== 'all') {
      setActiveTab('all');
    }
  }, [activeTab]);

  // Handle filter state from FilterToolbar
  const handleToolbarFilterChange = useCallback((newFilterState) => {
    setFilterState(newFilterState);
  }, []);

  // Apply filterState to workorders for table display
  const displayedWorkorders = useMemo(() => {
    if (!workorders.length) return [];

    const keyword = (filterState.keyword || '').trim().toLowerCase();

    return workorders.filter((item) => {
      // Scope filter
      if (filterState.scope === 'valid' && !item.isValidForAnalysis) return false;
      if (filterState.scope === 'invalid' && item.isValidForAnalysis) return false;

      // Status filter
      const statusGroup = item.statusGroup || '';
      if (filterState.excludedStatuses.includes(item.status)) return false;
      if (filterState.excludedStatuses.includes(statusGroup)) return false;

      // Invalid type filter
      if (filterState.excludedInvalidTypes.includes(item.invalidType || 'incomplete') && !item.isValidForAnalysis) return false;

      // Keyword search
      if (keyword && !String(item.description || '').toLowerCase().includes(keyword)) return false;

      return true;
    });
  }, [workorders, filterState]);

  // Compute data for tab views
  const pendingReviewData = useMemo(() => {
    return workorders.filter((w) =>
      w.isValidForAnalysis &&
      (w.status === '待教研验收' || w.statusGroup === '待验收')
    );
  }, [workorders]);

  const reworkData = useMemo(() => {
    return workorders.filter((w) => w.isRepeatedAdjustmentCandidate && w.isValidForAnalysis);
  }, [workorders]);

  const invalidData = useMemo(() => {
    return workorders.filter((w) => !w.isValidForAnalysis);
  }, [workorders]);

  // Compute focus workorders for auto-scroll
  const focusWorkorders = useMemo(() => {
    const seen = new Set();
    const valid = workorders.filter((w) => w.isValidForAnalysis);
    return valid
      .filter((w) => w.isRepeatedAdjustmentCandidate || w.isUnclearRequirement || w.riskLevel === '高' || w.status !== '完成归档')
      .filter((w) => {
        if (seen.has(w.id)) return false;
        seen.add(w.id);
        return true;
      })
      .sort((a, b) => {
        const riskScore = { '高': 3, '中': 2, '低': 1 };
        const score = (item) => (item.isRepeatedAdjustmentCandidate ? 40 : 0) + (riskScore[item.riskLevel] || 0) * 10 + (item.isUnclearRequirement ? 20 : 0) + (item.status !== '完成归档' ? 10 : 0);
        return score(b) - score(a);
      });
  }, [workorders]);

  function handleToggleUrgent(id, isUrgent) {
    setWorkorders((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isUrgent } : w))
    );
  }

  useEffect(() => {
    getHealth().then(() => setHealth('后端已连接')).catch(() => setHealth('后端未连接'));
    getSources().then((result) => {
      setSources(result.sources || []);
      setSourceId(result.defaultSourceId || result.sources?.[0]?.id || 'summer_2026');
    }).catch(() => {
      console.error('Failed to load sources, using default');
      setSourceId('summer_2026');
    });
    getFeishuStatus().then(setFeishuStatus).catch(() => setFeishuStatus({ configured: false, hint: '无法检查飞书配置状态' }));
  }, []);

  useEffect(() => {
    loadDashboardData(sourceId);
    loadCommandData(sourceId);
  }, [sourceId]);

  // Auto-expand data source panel when no workorders are loaded
  useEffect(() => {
    if (!loading && workorders.length === 0) {
      setDataSourceExpanded(true);
    }
  }, [loading, workorders.length]);

  useEffect(() => {
    if (!autoSyncEnabled || !sourceId) return undefined;
    const timer = window.setInterval(() => {
      handleManualSync();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [autoSyncEnabled, sourceId]);

  return (
    <main className="dashboard">
      {/* Header */}
      <header className="hero">
        <div>
          <p className="eyebrow">Course Production · Workorder Review</p>
          <h1>课程生产工单复盘看板</h1>
          <p>聚焦有效工单中的高频出错内容、需求不明确、状态流转和疑似反复调整问题，辅助团队持续改进生产质量。</p>
        </div>
        <div className="hero-actions">
          <span className={`health-badge ${health === '后端已连接' ? 'ok' : 'warn'}`}>{health}</span>
          <button className="secondary-button" type="button" disabled={!stats.totalRawCount} onClick={() => downloadReviewReport(stats)}>
            📄 导出复盘报告
          </button>
          <button className="secondary-button" type="button" onClick={() => setShowClassificationPanel(true)} title="管理分类规则">
            ⚙ 分类规则
          </button>
        </div>
      </header>

      {/* View Mode Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
        <button
          className={`secondary-button ${viewMode === 'command' ? 'active-view-btn' : ''}`}
          onClick={() => setViewMode('command')}
          style={{ fontSize: 12, padding: '6px 14px' }}
        >
          📊 生产指挥舱
        </button>
        <button
          className={`secondary-button ${viewMode === 'legacy' ? 'active-view-btn' : ''}`}
          onClick={() => setViewMode('legacy')}
          style={{ fontSize: 12, padding: '6px 14px' }}
        >
          📋 复盘看板
        </button>
      </div>

      {/* ── 生产指挥舱视图 ── */}
      {viewMode === 'command' && (
        <>
          <TabNavigation
            activeTab={activeCommandTab}
            onTabChange={setActiveCommandTab}
            badgeCounts={tabBadgeCounts}
          />

          <div className="cc-dashboard-content">
            {activeCommandTab === 'overview' && (
              <OverviewTab data={commandData?.overview} />
            )}
            {activeCommandTab === 'diagnostics' && (
              <DiagnosticsTab
                data={commandData?.diagnostics}
                onCellClick={handleHeatmapCellClick}
                onResearcherClick={handleResearcherClick}
              />
            )}
            {activeCommandTab === 'tasklist' && (
              <TaskListTab data={commandData?.tasklist} />
            )}
            {activeCommandTab === 'forecast' && (
              <ForecastTab data={commandData?.forecast} />
            )}
          </div>

          {/* 刷新时间 */}
          {commandData?._meta && (
            <div className="cc-refresh-info">
              数据计算时间：{new Date(commandData._meta.computedAt).toLocaleString('zh-CN')}
              {' · '}共 {commandData._meta.totalWorkorders} 条工单（有效 {commandData._meta.validWorkorders} 条）
            </div>
          )}
        </>
      )}

      {/* ── 传统复盘看板视图（保留）── */}
      {viewMode === 'legacy' && (
      <>

      {/* Data Source & Upload — visually subdued, collapsible */}
      <div className="bottom-collapsible" style={{ marginTop: 20 }}>
        <button
          className={`collapsible-toggle ${dataSourceExpanded ? 'open' : ''}`}
          onClick={() => setDataSourceExpanded(!dataSourceExpanded)}
          style={{ padding: '10px 18px', fontSize: 13 }}
        >
          <span className="toggle-icon">▶</span>
          {dataSourceExpanded ? '收起' : '展开'} 数据源配置与上传
          <span style={{ marginLeft: 8, fontSize: 12, color: '#94A3B8', fontWeight: 400 }}>
            {sources.length ? `当前数据源：${sources.find(s => s.id === sourceId)?.name || '-'}` : '未配置'}
          </span>
        </button>
        {dataSourceExpanded && (
          <div className="collapsible-content">
            <DataSourceBar
              sources={sources} sourceId={sourceId} autoSyncEnabled={autoSyncEnabled}
              lastSyncedAt={lastSyncedAt} syncing={syncing} syncMessage={syncMessage}
              feishuStatus={feishuStatus} onSourceChange={setSourceId}
              onAutoSyncChange={setAutoSyncEnabled} onManualSync={handleManualSync}
            />
            <UploadExcel sourceId={sourceId} onUploaded={handleUploaded} />
          </div>
        )}
      </div>

      {/* Stats Cards — prominent KPI row */}
      <StatsCards stats={stats} onFilterChange={handleFilterChange} />

      {/* Main Split Layout — conclusion (left) + data table (right) */}
      <div className="dashboard-split">
        <LeftConclusionPanel
          stats={stats}
          onFilterChange={handleFilterChange}
          activeFilter={activeFilter}
          onErrorCardClick={setErrorDetail}
        />
        <RightDataPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          workorders={displayedWorkorders}
          stats={stats}
          activeFilter={activeFilter}
          filterState={filterState}
          onFilterChange={handleToolbarFilterChange}
          pendingReviewData={pendingReviewData}
          reworkData={reworkData}
          invalidData={invalidData}
          onToggleUrgent={handleToggleUrgent}
        />
      </div>

      {/* Auto-scroll Focus Workorders — prominent */}
      <AutoScrollWorkorders
        workorders={focusWorkorders}
        onCardClick={setDetailWorkorder}
        autoPlay={true}
        maxItems={20}
      />

      {/* Bottom Collapsible: Charts & Time Analysis */}
      <div className="bottom-collapsible">
        <button
          className={`collapsible-toggle ${bottomExpanded ? 'open' : ''}`}
          onClick={() => setBottomExpanded(!bottomExpanded)}
        >
          <span className="toggle-icon">▶</span>
          {bottomExpanded ? '收起' : '展开'} 辅助图表与时间分析
        </button>
        {bottomExpanded && (
          <div className="collapsible-content">
            <TimeAnalysis stats={stats} />
            <Charts stats={stats} />
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && <div className="panel loading" style={{ marginTop: 20 }}>正在读取本地工单数据...</div>}

      {/* Classification Panel (slide-out) */}
      {showClassificationPanel && (
        <ClassificationPanel
          sourceId={sourceId}
          stats={stats}
          onClose={() => setShowClassificationPanel(false)}
          onReanalyzed={handleReanalyzed}
        />
      )}

      {/* Error Detail Modal */}
      {errorDetail && (
        <ErrorDetailModal
          item={errorDetail}
          onClose={() => setErrorDetail(null)}
          onViewExample={(example) => {
            setErrorDetail(null);
            setDetailWorkorder(example);
          }}
        />
      )}

      {/* Detail Modal */}
      {detailWorkorder && (
        <WorkorderDetailModal
          workorder={detailWorkorder}
          onClose={() => setDetailWorkorder(null)}
        />
      )}

      {/* Close legacy view wrapper */}
      </>
      )}

    </main>
  );
}
