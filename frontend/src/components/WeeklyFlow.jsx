import { useMemo } from 'react';
import { Icon } from '@iconify/react';

/**
 * 本周工单流转面板 — 数值 + 迷你趋势 + 状态分布 + 时间线
 */
export default function WeeklyFlow({ stats = {}, workorders = [] }) {
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // 最近7天每日新增/归档统计（用于迷你折线图）
  const daily7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayWorkorders = workorders.filter(w => {
        const wd = (w.submittedAt || w.updatedAt || '').slice(0, 10);
        return wd === ds;
      });
      days.push({
        date: ds,
        label: d.toLocaleDateString('zh-CN', { weekday: 'short' }),
        count: dayWorkorders.length,
      });
    }
    return days;
  }, [workorders, now]);

  const maxDaily = Math.max(...daily7.map(d => d.count), 1);

  const recentWorkorders = workorders.filter((w) => {
    const d = w.submittedAt || w.updatedAt;
    return d && new Date(d) >= oneWeekAgo;
  });

  const newThisWeek = recentWorkorders.length;
  const archivedThisWeek = recentWorkorders.filter((w) =>
    w.status === '完成归档'
  ).length;
  const blockedThisWeek = recentWorkorders.filter((w) =>
    w.status === '暂停/挂起' || w.riskLevel === '高'
  ).length;

  // 全部工单状态分布
  const allTotal = workorders.length || 1;
  const statusGroups = [
    { label: '已归档', count: stats.archivedCount || workorders.filter(w => w.status === '完成归档').length, color: 'var(--green)', icon: 'mdi:check-circle' },
    { label: '进行中', count: workorders.filter(w => w.status !== '完成归档' && w.status !== '暂停/挂起').length, color: 'var(--gold)', icon: 'mdi:progress-clock' },
    { label: '暂停', count: workorders.filter(w => w.status === '暂停/挂起').length, color: 'var(--red)', icon: 'mdi:pause-circle' },
    { label: '高风险', count: stats.highRiskCount || workorders.filter(w => w.riskLevel === '高').length, color: 'var(--red-dark)', icon: 'mdi:alert-circle' },
  ];

  // 时间线
  const timeline = recentWorkorders
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt) - new Date(a.updatedAt || a.submittedAt))
    .slice(0, 5)
    .map((w) => {
      const isArchived = w.status === '完成归档';
      const isBlocked = w.status === '暂停/挂起' || w.riskLevel === '高';
      return {
        text: isArchived ? `归档：${(w.description || '').slice(0, 24)}...`
             : isBlocked ? `阻塞：${(w.description || '').slice(0, 24)}...`
             : `更新：${(w.description || '').slice(0, 24)}...`,
        time: w.updatedAt || w.submittedAt,
        type: isArchived ? 'green' : isBlocked ? 'red' : 'brand'
      };
    });

  return (
    <div className="panel">
      <div className="panel-hd">
        <span className="ph-t"><span className="ph-dot" style={{ background: 'var(--brand)' }} />本周工单流转</span>
        <span style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)' }}>近 7 天</span>
      </div>
      <div className="panel-bd">
        {/* 左：流转数值 + 右：迷你趋势 + 状态分布 */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
          {/* 左侧：2×2 数值网格 */}
          <div style={{ flex: 1.1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { label: '本周新增', value: `+${newThisWeek}`, icon: 'mdi:plus-circle-outline', color: 'var(--brand)' },
              { label: '本周归档', value: `-${archivedThisWeek}`, icon: 'mdi:check-circle-outline', color: 'var(--green)' },
              { label: '阻塞风险', value: `${blockedThisWeek}`, icon: 'mdi:alert-circle-outline', color: 'var(--red-dark)' },
              { label: '净变化', value: (newThisWeek - archivedThisWeek >= 0 ? '+' : '') + (newThisWeek - archivedThisWeek), icon: 'mdi:swap-vertical', color: 'var(--gold)' },
            ].map((item) => (
              <div key={item.label} style={{
                textAlign: 'center', padding: '6px 4px', borderRadius: 8,
                background: '#FFFDFC', border: '1px solid var(--border-subtle)',
              }}>
                <Icon icon={item.icon} width={14} height={14} style={{ color: item.color, marginBottom: 1 }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: item.color, lineHeight: 1.1 }}>{item.value}</div>
                <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-muted)' }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* 右侧：迷你折线图 + 摘要 */}
          <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
            <div style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon icon="mdi:chart-line-variant" width={13} height={13} />
              近7天新增趋势
            </div>
            {/* 迷你折线图 SVG */}
            <svg viewBox="0 0 140 36" style={{ width: '100%', height: 36 }}>
              {/* 基线 */}
              <line x1="0" y1="30" x2="140" y2="30" stroke="var(--border-subtle)" strokeWidth="0.5" />
              {/* 折线 */}
              <polyline
                fill="none"
                stroke="var(--brand)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={daily7.map((d, i) => {
                  const x = 10 + i * 20;
                  const y = d.count > 0 ? 30 - (d.count / maxDaily) * 22 : 28;
                  return `${x},${y}`;
                }).join(' ')}
              />
              {/* 填充 */}
              <polygon
                fill="rgba(222,16,32,0.08)"
                points={`10,30 ${daily7.map((d, i) => {
                  const x = 10 + i * 20;
                  const y = d.count > 0 ? 30 - (d.count / maxDaily) * 22 : 28;
                  return `${x},${y}`;
                }).join(' ')} 130,30`}
              />
              {/* 数据点 */}
              {daily7.map((d, i) => {
                const x = 10 + i * 20;
                const y = d.count > 0 ? 30 - (d.count / maxDaily) * 22 : 28;
                return d.count > 0 ? (
                  <circle key={i} cx={x} cy={y} r="2.5" fill="var(--brand)" />
                ) : null;
              })}
            </svg>
            {/* 摘要 */}
            <div style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-secondary)', textAlign: 'center' }}>
              近7天累计新增 <strong style={{color:'var(--brand)'}}>{newThisWeek}</strong> 单
              {newThisWeek > 0 ? ` · 日均 ${(newThisWeek / 7).toFixed(1)} 单` : ''}
            </div>
          </div>
        </div>

        {/* 状态分布条 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          {statusGroups.map((sg) => {
            const pct = Math.round((sg.count / allTotal) * 100);
            return (
              <div key={sg.label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon icon={sg.icon} width={11} height={11} style={{ color: sg.color, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: sg.color }} />
                </div>
                <span style={{ fontSize: 'var(--fs-micro)', fontWeight: 600, color: sg.color, minWidth: 20, textAlign: 'right' }}>{sg.count}</span>
              </div>
            );
          })}
        </div>

        {/* 时间线 */}
        {timeline.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
            <div className="tl">
              {timeline.map((item, i) => (
                <div key={i} className="tl-item">
                  <span className="tl-dot" style={{ background: item.type === 'green' ? 'var(--green)' : item.type === 'red' ? 'var(--red)' : 'var(--brand)' }} />
                  <div className="tl-body">
                    <span className="tl-t">{item.text}</span>
                    <br /><span className="tl-time">{item.time ? new Date(item.time).toLocaleString('zh-CN') : ''}</span>
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
