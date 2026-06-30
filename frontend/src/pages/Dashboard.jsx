import { useEffect, useState } from 'react';
import { getHealth, getStats, getWorkorders } from '../api/workorders.js';
import Charts from '../components/Charts.jsx';
import ConclusionSection from '../components/ConclusionSection.jsx';
import FocusWorkorders from '../components/FocusWorkorders.jsx';
import StatsCards from '../components/StatsCards.jsx';
import UploadExcel from '../components/UploadExcel.jsx';
import WorkorderTable from '../components/WorkorderTable.jsx';
import { downloadReviewReport } from '../utils/report.js';

const emptyStats = {
  totalCount: 0,
  unfinishedCount: 0,
  completionRate: 0,
  unclearCount: 0,
  unclearRate: 0,
  highRiskCount: 0,
  repeatedAdjustmentCandidateCount: 0,
  repeatedAdjustmentRate: 0,
  topIssueCategory: '',
  classificationWarning: '',
  typeRanking: [],
  issueCategoryRanking: [],
  unclearReasonRanking: [],
  repeatedAdjustmentRanking: [],
  errorContentRanking: [],
  gradeRanking: [],
  weekRanking: [],
  focusWorkorders: []
};

export default function Dashboard() {
  const [workorders, setWorkorders] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [health, setHealth] = useState('连接中');
  const [loading, setLoading] = useState(true);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [workordersResult, statsResult] = await Promise.all([getWorkorders(), getStats()]);
      setWorkorders(workordersResult.workorders || []);
      setStats({ ...emptyStats, ...(statsResult || {}) });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleUploaded(result) {
    setWorkorders(result.workorders || []);
    setStats({ ...emptyStats, ...(result.stats || {}) });
  }

  useEffect(() => {
    getHealth()
      .then(() => setHealth('后端已连接'))
      .catch(() => setHealth('后端未连接'));
    loadDashboardData();
  }, []);

  return (
    <main className="dashboard">
      <header className="hero">
        <div>
          <p className="eyebrow">Workorder Review Dashboard</p>
          <h1>试题生产工单复盘看板</h1>
          <p>聚焦高频出错内容、需求不明确、疑似反复调整和重点工单，让暑期生产复盘结论一眼可见。</p>
        </div>
        <div className="hero-actions">
          <span className={`health-badge ${health === '后端已连接' ? 'ok' : 'warn'}`}>{health}</span>
          <button className="secondary-button" type="button" disabled={!stats.totalCount} onClick={() => downloadReviewReport(stats)}>
            导出复盘报告
          </button>
        </div>
      </header>

      <UploadExcel onUploaded={handleUploaded} />
      <StatsCards stats={stats} />
      <ConclusionSection stats={stats} />
      <Charts stats={stats} />
      <FocusWorkorders stats={stats} />
      {loading ? <div className="panel loading">正在读取本地工单数据...</div> : <WorkorderTable workorders={workorders} />}
    </main>
  );
}
