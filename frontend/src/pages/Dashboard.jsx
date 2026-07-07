import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFeishuStatus, getHealth, getSources, getStats, getWorkorders, syncFeishu, syncFeishuComments, getCommandAll } from '../api/workorders.js';
import Charts from '../components/Charts.jsx';
import ClassificationPanel from '../components/ClassificationPanel.jsx';
import DataSourceBar from '../components/DataSourceBar.jsx';
import TimeAnalysis from '../components/TimeAnalysis.jsx';
import UploadExcel from '../components/UploadExcel.jsx';
import OverviewDashboard from '../components/OverviewDashboard.jsx';
import ErrorDetailModal from '../components/ErrorDetailModal.jsx';
import WorkorderDetailModal from '../components/WorkorderDetailModal.jsx';
import TabNavigation from '../components/TabNavigation.jsx';
import OverviewTab from '../components/commandCenter/OverviewTab.jsx';
import DiagnosticsTab from '../components/commandCenter/DiagnosticsTab.jsx';
import TaskListTab from '../components/commandCenter/TaskListTab.jsx';
import ForecastTab from '../components/commandCenter/ForecastTab.jsx';
import { downloadReviewReport } from '../utils/report.js';
import Sidebar from '../components/Sidebar.jsx';
import UserProfile from '../components/UserProfile.jsx';
import CommentDrawer from '../components/CommentDrawer.jsx';
import { Icon } from '@iconify/react';

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
  const [showClassificationPanel, setShowClassificationPanel] = useState(false);

  // Detail modal state
  const [detailWorkorder, setDetailWorkorder] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  // Comment state
  const [commentWorkorder, setCommentWorkorder] = useState(null);
  const [syncingComments, setSyncingComments] = useState(false);
  const [commentSyncMessage, setCommentSyncMessage] = useState('');
  const [customTableUrl, setCustomTableUrl] = useState('');

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
    // 刷新指挥舱数据（飞书同步后图表需要更新）
    if (sourceId) loadCommandData(sourceId);
  }

  async function handleManualSync(customBitableUrl) {
    if (!sourceId) return;
    setSyncing(true);
    setSyncMessage('');
    try {
      if (customBitableUrl) setCustomTableUrl(customBitableUrl);
      const options = {};
      if (customBitableUrl) {
        options.bitableUrl = customBitableUrl;
        const tableMatch = String(customBitableUrl).match(/[?&]table=([^&#]+)/);
        if (tableMatch) options.tableId = tableMatch[1];
      }
      const result = await syncFeishu(sourceId, options);
      applySyncResult(result);
      await loadCommandData(sourceId);
      const tableInfo = customBitableUrl ? '（自定义表格）' : '';
      setSyncMessage(`同步成功${tableInfo}：共 ${result.count || 0} 条工单`);
    } catch (error) {
      const message = error.message || '飞书同步失败';
      setSyncMessage(`同步失败：${message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncComments() {
    setSyncingComments(true);
    setCommentSyncMessage('');
    try {
      const options = {};
      if (customTableUrl) options.bitableUrl = customTableUrl;
      const result = await syncFeishuComments(false, options);
      const msg = result.savedCommentCount !== undefined
        ? `评论同步成功！共 ${result.rawCommentCount} 条评论，保存 ${result.savedCommentCount} 条`
        : `评论同步成功：${result.message || '已完成'}`;
      setCommentSyncMessage(msg);
      await loadDashboardData(sourceId);
    } catch (error) {
      let message = error.message || '评论同步失败';
      try {
        const body = JSON.parse(error.message);
        if (body?.permissionHint) {
          message = `${body.message || '权限不足'}\n${body.permissionHint.summary}\n需要权限: ${body.permissionHint.requiredScope}`;
        }
        // eslint-disable-next-line no-empty
      } catch {}
      setCommentSyncMessage(`❌ ${message}`);
      console.error('评论同步详细错误:', error);
    } finally {
      setSyncingComments(false);
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

  // 有评论的工单
  const commentedWorkorders = useMemo(() => {
    return workorders
      .filter((w) => (w.comment_count || 0) > 0)
      .sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
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

  useEffect(() => {
    if (!autoSyncEnabled || !sourceId) return undefined;
    const timer = window.setInterval(() => {
      handleManualSync();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [autoSyncEnabled, sourceId]);

  // ── 侧边栏导航处理 ──
  function handleNavigate(view) {
    if (view === 'command' || view === 'legacy' || view === 'profile') {
      setViewMode(view);
    } else if (view === 'rules') {
      setShowClassificationPanel(true);
    } else if (view === 'export') {
      if (stats.totalRawCount) downloadReviewReport(stats);
    } else if (view === 'import' || view === 'feishu') {
      // 数据导入/飞书同步 → 切换到数据看板，数据源面板始终可见
      setViewMode('legacy');
    }
  }

  function handleSidebarAction(actionId) {
    if (actionId === 'export') {
      if (stats.totalRawCount) downloadReviewReport(stats);
    }
  }

  return (
    <div className="dashboard">
      {/* ── 侧边栏 ── */}
      <Sidebar
        activeView={viewMode}
        onNavigate={handleNavigate}
        onAction={handleSidebarAction}
      />

      {/* ── 主内容区 ── */}
      <div className="dashboard-main">

        {/* ── 顶部栏 ── */}
        <div className="new-topbar">
          <div className="new-topbar-left">
            <div className="new-topbar-icon">
              <Icon icon="mdi:view-dashboard-outline" width={20} height={20} />
            </div>
            <div>
              <div className="new-topbar-breadcrumb">
                雪球课堂 <em>/</em> 数据看板 <em>/</em> <span style={{color:'var(--text-primary)',fontWeight:600}}>工单复盘</span>
              </div>
              <h1>课程生产工单 · 数据复盘看板</h1>
            </div>
          </div>
          <div className="new-topbar-right">
            <div className="new-topbar-search">
              <Icon icon="mdi:magnify" width={16} height={16} style={{color:'var(--text-muted)',flexShrink:0}} />
              <input
                type="text"
                placeholder="搜索工单、关键词、处理人..."
                value={filterState.keyword || ''}
                onChange={(e) => handleToolbarFilterChange({ ...filterState, keyword: e.target.value })}
              />
              <kbd>⌘K</kbd>
            </div>
            <button className="new-topbar-btn" title="通知">
              <Icon icon="mdi:bell-outline" width={18} height={18} />
            </button>
            <button className="new-topbar-btn" title="刷新" onClick={() => { loadDashboardData(sourceId); loadCommandData(sourceId); }}>
              <Icon icon="mdi:refresh" width={18} height={18} />
            </button>
            <span className={`health-badge ${health === '后端已连接' ? 'ok' : 'warn'}`} style={{fontSize:11}}>
              <Icon icon={health === '后端已连接' ? 'mdi:check-circle' : 'mdi:close-circle'} width={14} height={14} style={{color: health === '后端已连接' ? 'var(--green)' : 'var(--red)', marginRight: 4}} />
              {health === '后端已连接' ? '已连接' : '未连接'}
            </span>
            <button
              className="new-topbar-btn primary"
              type="button"
              disabled={!stats.totalRawCount}
              onClick={() => downloadReviewReport(stats)}
            >
              <Icon icon="mdi:file-export-outline" width={16} height={16} style={{marginRight:4}} /> 导出报告
            </button>
          </div>
        </div>

        {/* ── 内容区 ── */}
        <div className="content-area">

        {/* ── 个人主页视图 ── */}
        {viewMode === 'profile' && (
          <UserProfile
            stats={stats}
            workorders={workorders}
            feishuStatus={feishuStatus}
            health={health}
          />
        )}

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

        {/* ── 新版数据看板视图 ── */}
        {viewMode === 'legacy' && (
        <>

        {/* Data Source & Upload — always visible */}
        <div className="panel panel-datasource" style={{ marginTop: 8, marginBottom: 8 }}>
          <div className="panel-hd">
            <span className="ph-t ph-t-sm">
              <span className="ph-dot" style={{ background: 'var(--teal)' }} />
              数据源配置与上传
            </span>
            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-muted)', fontWeight: 400 }}>
              {sources.length ? `当前数据源：${sources.find(s => s.id === sourceId)?.name || '-'}` : '未配置'}
            </span>
          </div>
          <div className="panel-bd">
            <DataSourceBar
              sources={sources} sourceId={sourceId} autoSyncEnabled={autoSyncEnabled}
              lastSyncedAt={lastSyncedAt} syncing={syncing} syncMessage={syncMessage}
              feishuStatus={feishuStatus} onSourceChange={setSourceId}
              onAutoSyncChange={setAutoSyncEnabled} onManualSync={handleManualSync}
              syncingComments={syncingComments} commentSyncMessage={commentSyncMessage}
              onSyncComments={handleSyncComments}
            />
            <UploadExcel sourceId={sourceId} onUploaded={handleUploaded} />
          </div>
        </div>

        {/* ── 新版 Overview Dashboard ── */}
        <OverviewDashboard
          stats={stats}
          workorders={workorders}
          commandData={commandData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onFilterChange={handleFilterChange}
          displayedWorkorders={displayedWorkorders}
          filterState={filterState}
          onToolbarFilterChange={handleToolbarFilterChange}
          pendingReviewData={pendingReviewData}
          reworkData={reworkData}
          invalidData={invalidData}
          onToggleUrgent={handleToggleUrgent}
          activeFilter={activeFilter}
          onErrorCardClick={setErrorDetail}
          focusWorkorders={focusWorkorders}
          commentedWorkorders={commentedWorkorders}
          onDetailCardClick={setDetailWorkorder}
          onCommentClick={setCommentWorkorder}
        />

        {/* Supplementary Charts & Time Analysis — always visible */}
        <div className="sec-header">
          <span className="sec-title">辅助图表与时间分析</span>
        </div>
        <TimeAnalysis stats={stats} />
        <Charts stats={stats} />

        {/* Loading indicator */}
        {loading && <div className="panel loading" style={{ marginTop: 20 }}>正在读取本地工单数据...</div>}

        {/* Close legacy view wrapper */}
        </>
        )}

        </div>{/* /content-area */}

        {/* ── 全局弹窗（两种视图共用）── */}

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

        {/* Comment Drawer */}
        {commentWorkorder && (
          <CommentDrawer
            workorder={commentWorkorder}
            onClose={() => setCommentWorkorder(null)}
          />
        )}

      </div>{/* /dashboard-main */}
    </div>
  );
}
