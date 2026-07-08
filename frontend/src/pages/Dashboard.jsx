import { useCallback, useMemo, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
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

const defaultFilterState = {
  scope: 'valid',
  excludedStatuses: ['暂停/挂起'],
  excludedInvalidTypes: ['collaboration_placeholder', 'test_data', 'blank', 'incomplete'],
  keyword: ''
};

export default function Dashboard() {
  // ── 从 DataContext 获取核心状态 ──
  const {
    workorders, stats, commandData, sources, sourceId,
    health, loading, feishuStatus, syncing, syncMessage, lastSyncedAt,
    setSourceId, refresh, sync,
    updateWorkorders,
    pendingReviewData, reworkData, invalidData,
    focusWorkorders, commentedWorkorders,
  } = useData();

  // ── 本地 UI 状态 ──
  const [activeFilter, setActiveFilter] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filterState, setFilterState] = useState(defaultFilterState);
  const [showClassificationPanel, setShowClassificationPanel] = useState(false);
  const [detailWorkorder, setDetailWorkorder] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);
  const [commentWorkorder, setCommentWorkorder] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  // ── 生产指挥舱 UI ──
  const [activeCommandTab, setActiveCommandTab] = useState('overview');
  const [viewMode, setViewMode] = useState('legacy');

  // ── 自动同步 ──
  // 注：autoSync 逻辑从旧版迁移，统一使用 sync()
  // (autoSync timer kept simple for now)

  // ── 关键字搜索 ──
  const displayedWorkorders = useMemo(() => {
    if (!workorders.length) return [];
    const keyword = (filterState.keyword || '').trim().toLowerCase();
    return workorders.filter((item) => {
      if (filterState.scope === 'valid' && !item.isValidForAnalysis) return false;
      if (filterState.scope === 'invalid' && item.isValidForAnalysis) return false;
      if (filterState.excludedStatuses.includes(item.status)) return false;
      const statusGroup = item.statusGroup || '';
      if (filterState.excludedStatuses.includes(statusGroup)) return false;
      if (filterState.excludedInvalidTypes.includes(item.invalidType || 'incomplete') && !item.isValidForAnalysis) return false;
      if (keyword && !String(item.description || '').toLowerCase().includes(keyword)) return false;
      return true;
    });
  }, [workorders, filterState]);

  // ── 指挥舱交互 ──
  function handleHeatmapCellClick() { setActiveCommandTab('tasklist'); }
  function handleResearcherClick() { setActiveCommandTab('tasklist'); }

  const tabBadgeCounts = useMemo(() => ({
    tasklist: commandData?.tasklist?.workorders?.filter((w) => w.statusGroupV2 !== '已关闭').length || 0
  }), [commandData]);

  const handleFilterChange = useCallback((newFilter) => {
    setActiveFilter(newFilter);
    if (newFilter && activeTab !== 'all') setActiveTab('all');
  }, [activeTab]);

  const handleToolbarFilterChange = useCallback((newFilterState) => {
    setFilterState(newFilterState);
  }, []);

  // 侧边栏导航
  function handleNavigate(view) {
    if (view === 'command' || view === 'legacy' || view === 'profile') {
      setViewMode(view);
    } else if (view === 'rules') {
      setShowClassificationPanel(true);
    } else if (view === 'export') {
      if (stats.totalRawCount) downloadReviewReport(stats);
    } else if (view === 'import' || view === 'feishu') {
      setViewMode('legacy');
    }
  }

  function handleSidebarAction(actionId) {
    if (actionId === 'export' && stats.totalRawCount) downloadReviewReport(stats);
  }

  // ── 同步回调（传递给 DataSourceBar）──
  async function handleManualSync(customBitableUrl) {
    await sync(customBitableUrl);
  }

  // ── Excel 上传回调 ──
  function handleUploaded(result) {
    if (result?.workorders) updateWorkorders(result.workorders, result.stats);
    refresh();
  }

  // ── 重新分析回调 ──
  function handleReanalyzed(result) {
    if (result?.workorders) updateWorkorders(result.workorders, result.stats);
    refresh();
  }

  return (
    <div className="dashboard">
      <Sidebar
        activeView={viewMode}
        onNavigate={handleNavigate}
        onAction={handleSidebarAction}
      />

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
            <button className="new-topbar-btn" title="刷新" onClick={refresh}>
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

        <div className="content-area">

        {/* ── 个人主页视图 ── */}
        {viewMode === 'profile' && (
          <UserProfile stats={stats} workorders={workorders} feishuStatus={feishuStatus} health={health} />
        )}

        {/* ── 生产指挥舱视图 ── */}
        {viewMode === 'command' && (
          <>
            <TabNavigation activeTab={activeCommandTab} onTabChange={setActiveCommandTab} badgeCounts={tabBadgeCounts} />
            <div className="cc-dashboard-content">
              {activeCommandTab === 'overview' && <OverviewTab data={commandData?.overview} />}
              {activeCommandTab === 'diagnostics' && (
                <DiagnosticsTab data={commandData?.diagnostics} onCellClick={handleHeatmapCellClick} onResearcherClick={handleResearcherClick} />
              )}
              {activeCommandTab === 'tasklist' && <TaskListTab data={commandData?.tasklist} />}
              {activeCommandTab === 'forecast' && <ForecastTab data={commandData?.forecast} />}
            </div>
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
                />
                <UploadExcel sourceId={sourceId} onUploaded={handleUploaded} />
              </div>
            </div>

            <OverviewDashboard
              stats={stats} workorders={workorders} commandData={commandData}
              activeTab={activeTab} onTabChange={setActiveTab}
              onFilterChange={handleFilterChange}
              displayedWorkorders={displayedWorkorders}
              filterState={filterState}
              onToolbarFilterChange={handleToolbarFilterChange}
              pendingReviewData={pendingReviewData}
              reworkData={reworkData}
              invalidData={invalidData}
              activeFilter={activeFilter}
              onErrorCardClick={setErrorDetail}
              focusWorkorders={focusWorkorders}
              commentedWorkorders={commentedWorkorders}
              onDetailCardClick={setDetailWorkorder}
              onCommentClick={setCommentWorkorder}
            />

            <div className="sec-header">
              <span className="sec-title">辅助图表与时间分析</span>
            </div>
            <TimeAnalysis stats={stats} />
            <Charts stats={stats} />

            {loading && <div className="panel loading" style={{ marginTop: 20 }}>正在读取本地工单数据...</div>}
          </>
        )}

        </div>{/* /content-area */}

        {/* ── 全局弹窗 ── */}
        {showClassificationPanel && (
          <ClassificationPanel
            sourceId={sourceId} stats={stats}
            onClose={() => setShowClassificationPanel(false)}
            onReanalyzed={handleReanalyzed}
          />
        )}
        {errorDetail && (
          <ErrorDetailModal
            item={errorDetail} onClose={() => setErrorDetail(null)}
            onViewExample={(example) => { setErrorDetail(null); setDetailWorkorder(example); }}
          />
        )}
        {detailWorkorder && (
          <WorkorderDetailModal workorder={detailWorkorder} onClose={() => setDetailWorkorder(null)} />
        )}
        {commentWorkorder && (
          <CommentDrawer workorder={commentWorkorder} onClose={() => setCommentWorkorder(null)} />
        )}
      </div>
    </div>
  );
}
