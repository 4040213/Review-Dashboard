import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFeishuStatus, getHealth, getSources, getStats, getWorkorders, syncFeishu } from '../api/workorders.js';
import Charts from '../components/Charts.jsx';
import ClassificationPanel from '../components/ClassificationPanel.jsx';
import DataSourceBar from '../components/DataSourceBar.jsx';
import LeftConclusionPanel from '../components/LeftConclusionPanel.jsx';
import RightDataPanel from '../components/RightDataPanel.jsx';
import StatsCards from '../components/StatsCards.jsx';
import TimeAnalysis from '../components/TimeAnalysis.jsx';
import UploadExcel from '../components/UploadExcel.jsx';
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
  const [sourceId, setSourceId] = useState('');
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

  async function loadDashboardData(nextSourceId = sourceId) {
    if (!nextSourceId) return;
    setLoading(true);
    try {
      const [workordersResult, statsResult] = await Promise.all([
        getWorkorders(nextSourceId),
        getStats(nextSourceId)
      ]);
      setWorkorders(workordersResult.workorders || []);
      setStats({ ...emptyStats, ...(statsResult || {}) });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function applySyncResult(result) {
    setWorkorders(result.workorders || []);
    setStats({ ...emptyStats, ...(result.stats || {}) });
    setLastSyncedAt(result.syncedAt || new Date().toISOString());
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
  }

  function handleReanalyzed(result) {
    if (result?.workorders) {
      setWorkorders(result.workorders);
    }
    if (result?.stats) {
      setStats({ ...emptyStats, ...result.stats });
    }
  }

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

  function handleToggleUrgent(id, isUrgent) {
    setWorkorders((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isUrgent } : w))
    );
  }

  useEffect(() => {
    getHealth().then(() => setHealth('后端已连接')).catch(() => setHealth('后端未连接'));
    getSources().then((result) => {
      setSources(result.sources || []);
      setSourceId(result.defaultSourceId || result.sources?.[0]?.id || '');
    }).catch(console.error);
    getFeishuStatus().then(setFeishuStatus).catch(() => setFeishuStatus({ configured: false, hint: '无法检查飞书配置状态' }));
  }, []);

  useEffect(() => {
    loadDashboardData(sourceId);
  }, [sourceId]);

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
          <p className="eyebrow">Workorder Review Dashboard</p>
          <h1>试题生产工单复盘看板</h1>
          <p>聚焦有效工单中的高频出错内容、需求不明确、状态流转和疑似反复调整问题。</p>
        </div>
        <div className="hero-actions">
          <span className={`health-badge ${health === '后端已连接' ? 'ok' : 'warn'}`}>{health}</span>
          <button className="secondary-button" type="button" disabled={!stats.totalRawCount} onClick={() => downloadReviewReport(stats)}>
            导出复盘报告
          </button>
          <button className="secondary-button" type="button" onClick={() => setShowClassificationPanel(true)} title="管理分类规则">
            ⚙ 分类规则
          </button>
        </div>
      </header>

      {/* Data Source & Upload */}
      <DataSourceBar
        sources={sources} sourceId={sourceId} autoSyncEnabled={autoSyncEnabled}
        lastSyncedAt={lastSyncedAt} syncing={syncing} syncMessage={syncMessage}
        feishuStatus={feishuStatus} onSourceChange={setSourceId}
        onAutoSyncChange={setAutoSyncEnabled} onManualSync={handleManualSync}
      />
      <UploadExcel sourceId={sourceId} onUploaded={handleUploaded} />

      {/* Stats Cards */}
      <StatsCards stats={stats} onFilterChange={handleFilterChange} />

      {/* Main Split Layout */}
      <div className="dashboard-split">
        <LeftConclusionPanel
          stats={stats}
          onFilterChange={handleFilterChange}
          activeFilter={activeFilter}
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
    </main>
  );
}
