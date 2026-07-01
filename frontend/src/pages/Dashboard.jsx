import { useEffect, useState } from 'react';
import { getFeishuStatus, getHealth, getSources, getStats, getWorkorders, syncFeishu } from '../api/workorders.js';
import Charts from '../components/Charts.jsx';
import ConclusionSection from '../components/ConclusionSection.jsx';
import DataSourceBar from '../components/DataSourceBar.jsx';
import FocusWorkorders from '../components/FocusWorkorders.jsx';
import StatsCards from '../components/StatsCards.jsx';
import StatusOverview from '../components/StatusOverview.jsx';
import TimeAnalysis from '../components/TimeAnalysis.jsx';
import TypicalCases from '../components/TypicalCases.jsx';
import UploadExcel from '../components/UploadExcel.jsx';
import WorkorderTable from '../components/WorkorderTable.jsx';
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
  timeTrend: [],
  durationStats: [],
  pendingDurationRanking: [],
  hasTimeAnalysisData: false
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

  async function loadDashboardData(nextSourceId = sourceId) {
    if (!nextSourceId) return;
    setLoading(true);
    try {
      const [workordersResult, statsResult] = await Promise.all([getWorkorders(nextSourceId), getStats(nextSourceId)]);
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
        </div>
      </header>

      <DataSourceBar sources={sources} sourceId={sourceId} autoSyncEnabled={autoSyncEnabled} lastSyncedAt={lastSyncedAt} syncing={syncing} syncMessage={syncMessage} feishuStatus={feishuStatus} onSourceChange={setSourceId} onAutoSyncChange={setAutoSyncEnabled} onManualSync={handleManualSync} />
      <UploadExcel sourceId={sourceId} onUploaded={handleUploaded} />
      <StatsCards stats={stats} />
      <StatusOverview stats={stats} />
      <ConclusionSection stats={stats} />
      <FocusWorkorders stats={stats} />
      <TypicalCases stats={stats} />
      <TimeAnalysis stats={stats} />
      <Charts stats={stats} />
      {loading ? <div className="panel loading">正在读取本地工单数据...</div> : <WorkorderTable workorders={workorders} />}
    </main>
  );
}
