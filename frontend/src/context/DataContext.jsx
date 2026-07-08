/**
 * 统一数据上下文 — DataContext
 *
 * 将 workorders / stats / commandData / sources 收敛到单一 Provider。
 * 数据加载采用独立并行策略：workorders+stats 与 commandData 分开加载，
 * 确保任一 API 失败不会级联影响另一方。
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import {
  getHealth, getSources, getWorkorders, getStats,
  getFeishuStatus, getCommandAll, syncFeishuAll,
} from '../api/workorders.js';

// ── 默认空状态 ──
const emptyStats = {
  totalRawCount: 0, totalCount: 0, validAnalysisCount: 0, invalidAnalysisCount: 0,
  unfinishedCount: 0, archivedCount: 0, archiveRate: 0, completionRate: 0,
  unclearCount: 0, unclearRate: 0, highRiskCount: 0,
  repeatedCandidateCount: 0, repeatedAdjustmentCandidateCount: 0, repeatedAdjustmentRate: 0,
  classificationWarning: '',
  typeRanking: [], issueCategoryRanking: [], unclearReasonRanking: [],
  repeatedAdjustmentRanking: [], errorContentRanking: [], statusRanking: [],
  statusGroupRanking: [], gradeRanking: [], weekRanking: [],
  focusWorkorders: [], typicalCases: { highRiskCases: [], unclearCases: [], repeatedAdjustmentCases: [] },
  timeTrend: [], durationStats: [], pendingDurationRanking: [], hasTimeAnalysisData: false,
  invalidReasonRanking: [], passRate: null, passTotal: 0,
};

const DataContext = createContext(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within <DataProvider>');
  return ctx;
}

export default function DataProvider({ children }) {
  // ── 核心数据 ──
  const [workorders, setWorkorders] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [commandData, setCommandData] = useState(null);
  const [sources, setSources] = useState([]);
  const [sourceId, setSourceId] = useState('summer_2026');
  const currentSourceId = useRef(sourceId);
  currentSourceId.current = sourceId;

  // ── 连接状态 ──
  const [health, setHealth] = useState('连接中');
  const [loading, setLoading] = useState(true);
  const [feishuStatus, setFeishuStatus] = useState(null);

  // ── 同步状态 ──
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState('');

  // ── 初始化：加载 sources + feishu status ──
  useEffect(() => {
    getHealth().then(() => setHealth('后端已连接')).catch(() => setHealth('后端未连接'));
    getSources().then((result) => {
      const srcs = result.sources || [];
      setSources(srcs);
      const defaultId = result.defaultSourceId || srcs[0]?.id || 'summer_2026';
      if (defaultId !== currentSourceId.current) {
        setSourceId(defaultId);
      }
    }).catch(() => {
      console.error('[DataContext] Failed to load sources, using default');
    });
    getFeishuStatus().then(setFeishuStatus).catch(() =>
      setFeishuStatus({ configured: false, hint: '无法检查飞书配置状态' })
    );
  }, []);

  // ── 独立加载：工单 + 统计 ──
  const loadWorkordersAndStats = useCallback(async (sid) => {
    if (!sid) return;
    try {
      const [woRes, statsRes] = await Promise.all([
        getWorkorders(sid),
        getStats(sid),
      ]);
      setWorkorders(woRes.workorders || []);
      setStats({ ...emptyStats, ...(statsRes || {}) });
      console.log(`[DataContext] 工单+统计加载完成: ${(woRes.workorders || []).length} 条`);
    } catch (error) {
      console.error('[DataContext] 工单/统计加载失败:', error.message);
    }
  }, []);

  // ── 独立加载：指挥舱数据 ──
  const loadCommandData = useCallback(async (sid) => {
    if (!sid) return;
    try {
      const cmdRes = await getCommandAll(sid);
      setCommandData(cmdRes);
      console.log(`[DataContext] 指挥舱数据加载完成: ${cmdRes?._meta?.totalWorkorders || 0} 条工单, ${cmdRes?._meta?.validWorkorders || 0} 有效`);
    } catch (error) {
      console.error('[DataContext] 指挥舱数据加载失败:', error.message);
      // 不覆盖已有数据，保留旧值
    }
  }, []);

  // ── 合并加载（刷新用）──
  const loadAllData = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    // 并行但独立：任一失败不影响另一方
    await Promise.allSettled([
      loadWorkordersAndStats(sid),
      loadCommandData(sid),
    ]);
    setLoading(false);
  }, [loadWorkordersAndStats, loadCommandData]);

  // ── sourceId 变化时重新加载 ──
  useEffect(() => {
    if (sourceId) {
      loadAllData(sourceId);
    }
  }, [sourceId, loadAllData]);

  // ── 刷新 ──
  const refresh = useCallback(() => {
    const sid = currentSourceId.current;
    if (sid) loadAllData(sid);
  }, [loadAllData]);

  // ── 统一同步 ──
  const sync = useCallback(async (customBitableUrl) => {
    const sid = currentSourceId.current;
    if (!sid) return null;
    setSyncing(true);
    setSyncMessage('');
    try {
      const options = {};
      if (customBitableUrl) {
        options.bitableUrl = customBitableUrl;
        const tableMatch = String(customBitableUrl).match(/[?&]table=([^&#]+)/);
        if (tableMatch) options.tableId = tableMatch[1];
      }
      const result = await syncFeishuAll(sid, options);

      // 覆盖率警告
      const coverage = result.workorders?.coverage;
      if (coverage?.warnings?.length) {
        console.warn('[DataContext] 字段覆盖率警告:', coverage.warnings);
        // 将覆盖率信息追加到同步消息中
        const criticalWarnings = coverage.warnings.filter((w) => w.startsWith('🔴'));
        if (criticalWarnings.length) {
          setSyncMessage(`⚠️ 字段缺失: ${criticalWarnings.map((w) => w.replace('🔴', '').trim()).join('; ')}`);
        }
      }

      setLastSyncedAt(result.syncedAt || new Date().toISOString());

      // 重载全量数据
      await loadAllData(sid);
      // 刷新数据源列表（自定义 URL 可能已被持久化）
      getSources().then((r) => setSources(r.sources || [])).catch(() => {});

      const parts = [`工单 ${result.workorders?.count || 0} 条`];
      if (result.comments?.savedCount > 0) parts.push(`评论 ${result.comments.savedCount} 条`);
      if (result.comments?.error) parts.push(`评论异常: ${result.comments.error}`);

      const finalMsg = `✅ 同步完成：${parts.join('，')}`;
      setSyncMessage(finalMsg);
      return result;
    } catch (error) {
      setSyncMessage(`❌ 同步失败：${error.message || '未知错误'}`);
      console.error('[DataContext] sync error:', error);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [loadAllData]);

  // ── 统计分析后更新 ──
  const updateWorkorders = useCallback((newWorkorders, newStats) => {
    setWorkorders(newWorkorders);
    if (newStats) setStats({ ...emptyStats, ...newStats });
  }, []);

  // ── 派生状态 ──
  const displayedWorkorders = useMemo(() => workorders, [workorders]);

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

  const focusWorkorders = useMemo(() => {
    const seen = new Set();
    const valid = workorders.filter((w) => w.isValidForAnalysis);
    return valid
      .filter((w) => w.isRepeatedAdjustmentCandidate || w.isUnclearRequirement || w.riskLevel === '高' || w.status !== '完成归档')
      .filter((w) => { if (seen.has(w.id)) return false; seen.add(w.id); return true; })
      .sort((a, b) => {
        const riskScore = { '高': 3, '中': 2, '低': 1 };
        const score = (item) => (item.isRepeatedAdjustmentCandidate ? 40 : 0) + (riskScore[item.riskLevel] || 0) * 10 + (item.isUnclearRequirement ? 20 : 0) + (item.status !== '完成归档' ? 10 : 0);
        return score(b) - score(a);
      });
  }, [workorders]);

  const commentedWorkorders = useMemo(() => {
    return workorders
      .filter((w) => (w.comment_count || 0) > 0)
      .sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
  }, [workorders]);

  const value = useMemo(() => ({
    workorders, stats, commandData, sources, sourceId,
    health, loading, feishuStatus,
    syncing, syncMessage, lastSyncedAt,
    setSourceId, refresh, sync,
    updateWorkorders,
    displayedWorkorders, pendingReviewData, reworkData, invalidData,
    focusWorkorders, commentedWorkorders,
  }), [
    workorders, stats, commandData, sources, sourceId,
    health, loading, feishuStatus,
    syncing, syncMessage, lastSyncedAt,
    refresh, sync, updateWorkorders,
    displayedWorkorders, pendingReviewData, reworkData, invalidData,
    focusWorkorders, commentedWorkorders,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
