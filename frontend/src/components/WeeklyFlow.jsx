/**
 * 本周工单流转面板 — ECharts 柱状图 + 周环比 + 状态分布 + 分类明细 + 时间线
 *
 * 相比旧版增强：
 * - 迷你 SVG 折线 → ECharts 每日新增/归档柱状图（支持 tooltip 交互）
 * - 新增周环比变化率
 * - 新增按类型分类的本周新增明细
 * - 时间线扩展至 8 条 + "查看全部"入口
 * - 卡片布局更饱满
 */
import { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Icon } from '@iconify/react';
import { cmdColors } from './charts/chartTheme.js';

/** 构建本周每日新增/归档柱状图 option */
function buildWeeklyBarOption(daily7) {
  if (!daily7?.length) return {};
  const dates = daily7.map((d) => d.label);
  const newVals = daily7.map((d) => d.count || 0);
  const archivedVals = daily7.map((d) => d.archivedCount || 0);

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderColor: 'rgba(255,255,255,0.8)',
      borderWidth: 1,
      textStyle: { color: cmdColors.text, fontSize: 12 },
      extraCssText: 'backdrop-filter: blur(18px); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.06);',
    },
    legend: { data: ['新增', '归档'], top: 0, textStyle: { color: cmdColors.textSecondary, fontSize: 10 } },
    grid: { top: 26, left: 36, right: 12, bottom: 16, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: cmdColors.textSecondary, fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', minInterval: 1,
      axisLabel: { color: cmdColors.textSecondary, fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } },
    },
    series: [
      {
        name: '新增', type: 'bar', data: newVals,
        barMaxWidth: 16, itemStyle: { color: cmdColors.brand, borderRadius: [6, 6, 0, 0] },
      },
      {
        name: '归档', type: 'bar', data: archivedVals,
        barMaxWidth: 16, itemStyle: { color: cmdColors.green, borderRadius: [6, 6, 0, 0] },
      },
    ],
  };
}

export default function WeeklyFlow({ stats = {}, workorders = [] }) {
  const now = new Date();
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  // ── 自动检测数据活跃窗口 ──
  // 如果最近7天有工单活动 → 显示"近7天"
  // 否则 → 找到数据中最近的一个7天活跃窗口，或显示"全部历史汇总"
  const { activeWindow, windowLabel, isHistorical } = useMemo(() => {
    if (!workorders.length) {
      return {
        activeWindow: { start: new Date(now - 7 * 86400000), end: now },
        windowLabel: '近 7 天',
        isHistorical: false,
      };
    }

    // 检查最近7天是否有数据
    const oneWeekAgo = new Date(now - 7 * 86400000);
    const hasRecent = workorders.some((w) => {
      const d = w.submittedAt || w.updatedAt;
      return d && new Date(d) >= oneWeekAgo;
    });

    if (hasRecent) {
      return {
        activeWindow: { start: oneWeekAgo, end: now },
        windowLabel: '近 7 天',
        isHistorical: false,
      };
    }

    // 历史数据：找到最近有数据的7天窗口
    const allDates = workorders
      .map((w) => w.submittedAt || w.updatedAt)
      .filter(Boolean)
      .map((d) => new Date(d))
      .sort((a, b) => b - a); // 最新在前

    if (allDates.length > 0) {
      const latestDate = allDates[0];
      const windowStart = new Date(latestDate);
      windowStart.setDate(windowStart.getDate() - 6);
      return {
        activeWindow: { start: windowStart, end: latestDate },
        windowLabel: `最近活跃期 (${windowStart.toLocaleDateString('zh-CN')} ~ ${latestDate.toLocaleDateString('zh-CN')})`,
        isHistorical: true,
      };
    }

    return {
      activeWindow: { start: new Date(now - 7 * 86400000), end: now },
      windowLabel: '近 7 天',
      isHistorical: false,
    };
  }, [workorders, now]);

  const { start: weekStart, end: weekEnd } = activeWindow;

  // ── 活跃窗口内每日新增/归档统计 ──
  const daily7 = useMemo(() => {
    const days = [];
    const cursor = new Date(weekStart);
    while (cursor <= weekEnd) {
      const ds = cursor.toISOString().slice(0, 10);
      const dayWorkorders = workorders.filter((w) => {
        const wd = (w.submittedAt || w.updatedAt || '').slice(0, 10);
        return wd === ds;
      });
      const dayArchived = dayWorkorders.filter((w) => w.status === '完成归档').length;
      days.push({
        date: ds,
        label: cursor.toLocaleDateString('zh-CN', { weekday: 'short' }),
        count: dayWorkorders.length,
        archivedCount: dayArchived,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [workorders, weekStart, weekEnd]);

  // ── 活跃窗口内工单 ──
  const thisWeek = useMemo(() => {
    return workorders.filter((w) => {
      const d = w.submittedAt || w.updatedAt;
      return d && new Date(d) >= weekStart && new Date(d) <= new Date(weekEnd.getTime() + 86400000);
    });
  }, [workorders, weekStart, weekEnd]);

  // 前一个等长周期
  const windowLen = (weekEnd - weekStart) / 86400000;
  const lastWeek = useMemo(() => {
    const prevEnd = new Date(weekStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - windowLen);
    return workorders.filter((w) => {
      const d = w.submittedAt || w.updatedAt;
      return d && new Date(d) >= prevStart && new Date(d) < weekStart;
    });
  }, [workorders, weekStart, weekEnd, windowLen]);

  const newThisWeek = thisWeek.length;
  const archivedThisWeek = thisWeek.filter((w) => w.status === '完成归档').length;
  const blockedThisWeek = thisWeek.filter((w) => w.status === '暂停/挂起' || w.riskLevel === '高').length;

  const newLastWeek = lastWeek.length;
  const archivedLastWeek = lastWeek.filter((w) => w.status === '完成归档').length;

  function weekOverWeek(current, previous) {
    if (previous === 0 && current === 0) return '';
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const pct = Math.round(((current - previous) / previous) * 100);
    return `${pct >= 0 ? '+' : ''}${pct}%`;
  }

  // ── 活跃窗口内工单按类型分类 ──
  const typeBreakdown = useMemo(() => {
    const map = {};
    thisWeek.forEach((w) => {
      const t = w.typeCategory || w.type || '其他';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / (thisWeek.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [thisWeek]);

  // ── 状态分布（全局统计，不受日期窗口影响）──
  const allTotal = workorders.length || 1;
  const statusGroups = [
    { label: '已归档', count: stats.archivedCount || workorders.filter((w) => w.status === '完成归档').length, color: 'var(--green)', icon: 'mdi:check-circle' },
    { label: '进行中', count: workorders.filter((w) => w.status !== '完成归档' && w.status !== '暂停/挂起').length, color: 'var(--gold)', icon: 'mdi:progress-clock' },
    { label: '暂停', count: workorders.filter((w) => w.status === '暂停/挂起').length, color: 'var(--red)', icon: 'mdi:pause-circle' },
    { label: '高风险', count: stats.highRiskCount || workorders.filter((w) => w.riskLevel === '高').length, color: 'var(--red-dark)', icon: 'mdi:alert-circle' },
  ];

  // ── 时间线（从活跃窗口取）──
  const timeline = thisWeek
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt))
    .slice(0, showAllTimeline ? 15 : 8)
    .map((w) => {
      const isArchived = w.status === '完成归档';
      const isBlocked = w.status === '暂停/挂起' || w.riskLevel === '高';
      return {
        text: isArchived ? `归档：${(w.description || '').slice(0, 28)}${(w.description || '').length > 28 ? '...' : ''}`
          : isBlocked ? `阻塞：${(w.description || '').slice(0, 28)}${(w.description || '').length > 28 ? '...' : ''}`
            : `更新：${(w.description || '').slice(0, 28)}${(w.description || '').length > 28 ? '...' : ''}`,
        time: w.updatedAt || w.submittedAt,
        type: isArchived ? 'green' : isBlocked ? 'red' : 'brand',
        status: w.status,
        gradeWeek: w.gradeWeek || '',
      };
    });

  const chartOption = useMemo(() => buildWeeklyBarOption(daily7), [daily7]);

  return (
    <div className="panel">
      <div className="panel-hd">
        <span className="ph-t"><span className="ph-dot" style={{ background: isHistorical ? 'var(--gold)' : 'var(--brand)' }} />工单流转</span>
        <span style={{ fontSize: 'var(--fs-overline)', color: isHistorical ? 'var(--gold)' : 'var(--text-muted)' }}>
          {windowLabel}
          {isHistorical && (
            <Icon icon="mdi:history" width={12} height={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
          )}
        </span>
      </div>
      <div className="panel-bd">
        {/* ── 第一行：4个核心数值（含周环比）── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[
            { label: '本周新增', value: `+${newThisWeek}`, icon: 'mdi:plus-circle-outline', color: 'var(--brand)', wow: weekOverWeek(newThisWeek, newLastWeek), wowColor: newThisWeek >= newLastWeek ? 'var(--red)' : 'var(--green)' },
            { label: '本周归档', value: `-${archivedThisWeek}`, icon: 'mdi:check-circle-outline', color: 'var(--green)', wow: weekOverWeek(archivedThisWeek, archivedLastWeek), wowColor: archivedThisWeek >= archivedLastWeek ? 'var(--green)' : 'var(--red)' },
            { label: '阻塞风险', value: `${blockedThisWeek}`, icon: 'mdi:alert-circle-outline', color: 'var(--red-dark)', wow: '', wowColor: '' },
            { label: '净变化', value: (newThisWeek - archivedThisWeek >= 0 ? '+' : '') + (newThisWeek - archivedThisWeek), icon: 'mdi:swap-vertical', color: 'var(--gold)', wow: '', wowColor: '' },
          ].map((item) => (
            <div key={item.label} style={{
              flex: 1, textAlign: 'center', padding: '8px 6px', borderRadius: 8,
              background: '#FFFDFC', border: '1px solid var(--border-subtle)',
            }}>
              <Icon icon={item.icon} width={14} height={14} style={{ color: item.color }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: item.color, lineHeight: 1.2 }}>{item.value}</div>
              <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>{item.label}</div>
              {item.wow && (
                <div style={{ fontSize: 'var(--fs-micro)', color: item.wowColor, fontWeight: 600, marginTop: 1 }}>
                  较上周 {item.wow}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── 第二行：ECharts 柱状图（每日新增/归档对比）── */}
        {daily7.some((d) => d.count > 0 || d.archivedCount > 0) ? (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Icon icon="mdi:chart-bar" width={13} height={13} />
              每日新增 vs 归档
            </div>
            <ReactECharts option={chartOption} style={{ height: 160 }} />
          </div>
        ) : (
          <div style={{
            height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 'var(--fs-caption)', marginBottom: 10,
            gap: 6, border: '1px dashed var(--border-subtle)', borderRadius: 8,
          }}>
            <Icon icon="mdi:chart-bar" width={18} height={18} style={{ opacity: 0.5 }} />
            本周暂无工单活动记录
          </div>
        )}

        {/* ── 第三行：类型分类明细 ── */}
        {typeBreakdown.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {typeBreakdown.map((t) => (
              <div key={t.name} style={{
                flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 6,
                background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', marginBottom: 1 }}>{t.name}</div>
                <div style={{ fontSize: 'var(--fs-body)', fontWeight: 700, color: 'var(--text-primary)' }}>{t.count}</div>
                <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>{t.pct}%</div>
              </div>
            ))}
          </div>
        )}

        {/* ── 第四行：状态分布条 ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {statusGroups.map((sg) => {
            const pct = Math.round((sg.count / allTotal) * 100);
            return (
              <div key={sg.label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon icon={sg.icon} width={12} height={12} style={{ color: sg.color, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(pct, 2)}%`, height: '100%', borderRadius: 3, background: sg.color, minWidth: pct > 0 ? 4 : 0 }} />
                </div>
                <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: sg.color, minWidth: 22, textAlign: 'right' }}>{sg.count}</span>
              </div>
            );
          })}
        </div>

        {/* ── 第五行：时间线 ── */}
        {timeline.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon icon="mdi:timeline-clock-outline" width={13} height={13} />
                最近活动
              </span>
              {thisWeek.length > 8 && (
                <span
                  onClick={() => setShowAllTimeline(!showAllTimeline)}
                  style={{ fontSize: 'var(--fs-micro)', color: 'var(--brand)', cursor: 'pointer' }}
                >
                  {showAllTimeline ? '收起' : `查看全部 (${thisWeek.length})`}
                </span>
              )}
            </div>
            <div className="tl">
              {timeline.map((item, i) => (
                <div key={i} className="tl-item">
                  <span className="tl-dot" style={{ background: item.type === 'green' ? 'var(--green)' : item.type === 'red' ? 'var(--red)' : 'var(--brand)' }} />
                  <div className="tl-body" style={{ flex: 1 }}>
                    <span className="tl-t">{item.text}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 1 }}>
                      <span className="tl-time">{item.time ? new Date(item.time).toLocaleString('zh-CN') : ''}</span>
                      {item.gradeWeek && (
                        <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '0 5px', borderRadius: 3 }}>{item.gradeWeek}</span>
                      )}
                      <span style={{
                        fontSize: 'var(--fs-micro)', padding: '0 5px', borderRadius: 3,
                        background: item.type === 'green' ? '#E8F5E9' : item.type === 'red' ? '#FFEBEE' : '#FFF3F4',
                        color: item.type === 'green' ? 'var(--green)' : item.type === 'red' ? 'var(--red)' : 'var(--brand)',
                      }}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
