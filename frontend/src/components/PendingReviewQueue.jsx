import { useState } from 'react';

function daysBetween(dateStr) {
  if (!dateStr) return null;
  const diff = new Date() - new Date(dateStr);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getPriorityScore(item) {
  const waitDays = daysBetween(item.updatedAt || item.submittedAt) || 0;
  const riskScore = { '高': 3, '中': 2, '低': 1 };
  const gradeWeights = { '三年级': 3, '二年级': 2, '一年级': 1 };
  return Math.round((waitDays * 0.4 + (riskScore[item.riskLevel] || 0) * 0.3 * 10 + (item.isRepeatedAdjustmentCandidate ? 20 : 0) * 0.2 + (gradeWeights[item.grade] || 0) * 0.1 * 10) * 10) / 10;
}

const SORT_OPTIONS = [
  { key: 'wait', label: '等待最久优先' },
  { key: 'risk', label: '高风险优先' },
  { key: 'grade', label: '按课程/年级' }
];

export default function PendingReviewQueue({ data, onToggleUrgent }) {
  const [sortBy, setSortBy] = useState('wait');

  const items = data || [];

  if (!items.length) {
    return (
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="empty-state small-empty">暂无待验收工单 🎉</div>
      </div>
    );
  }

  const avgWaitDays = items.reduce((sum, w) => sum + (daysBetween(w.updatedAt || w.submittedAt) || 0), 0) / items.length;
  const over7Count = items.filter((w) => (daysBetween(w.updatedAt || w.submittedAt) || 0) >= 7).length;

  const sorted = [...items].sort((a, b) => {
    switch (sortBy) {
      case 'risk': {
        const riskMap = { '高': 3, '中': 2, '低': 1 };
        return (riskMap[b.riskLevel] || 0) - (riskMap[a.riskLevel] || 0);
      }
      case 'grade': return (a.grade || '').localeCompare(b.grade || '', 'zh-CN');
      case 'wait':
      default: return (daysBetween(b.updatedAt || b.submittedAt) || 0) - (daysBetween(a.updatedAt || a.submittedAt) || 0);
    }
  });

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="section-heading" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>📋 待教研验收队列</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            ⏱ 平均等待 {avgWaitDays.toFixed(1)} 天
            {over7Count > 0 && <span style={{ color: '#F43F5E', marginLeft: 12 }}>🚨 积压超 7 天：{over7Count} 条</span>}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            style={{
              padding: '6px 16px',
              borderRadius: 999,
              border: `1.5px solid ${sortBy === opt.key ? '#2563EB' : 'rgba(148,163,184,0.2)'}`,
              background: sortBy === opt.key ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.6)',
              color: sortBy === opt.key ? '#2563EB' : '#64748B',
              fontSize: 13,
              fontWeight: sortBy === opt.key ? 600 : 400,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.18s ease'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((item, index) => {
          const waitDays = daysBetween(item.updatedAt || item.submittedAt);
          const isOverdue = waitDays !== null && waitDays >= 7;
          const isUrgent = item.isUrgent;

          return (
            <article
              key={item.id || index}
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                border: isOverdue ? '1.5px solid rgba(244,63,94,0.2)' : '1px solid rgba(148,163,184,0.12)',
                background: isUrgent ? 'rgba(255,245,245,0.65)' : 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 40 }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: isOverdue ? '#F43F5E' : '#2563EB',
                  lineHeight: 1.1
                }}>
                  {waitDays !== null ? waitDays : '?'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>天</div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <span className={`risk-tag risk-${item.riskLevel}`} style={{ fontSize: 11 }}>{item.riskLevel || '-'}风险</span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>{item.grade || '-'} / {item.week || '-'}</span>
                  {isOverdue && <span style={{ fontSize: 11, background: 'rgba(244,63,94,0.1)', color: '#F43F5E', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>⚠ 超期</span>}
                  {isUrgent && <span style={{ fontSize: 11, background: '#F43F5E', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>紧急</span>}
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#0F172A', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description || '未填写问题描述'}
                </p>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>负责人：{item.owner || '-'}</span>
                  <span>提交：{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('zh-CN') : '-'}</span>
                  <span>更新：{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('zh-CN') : '-'}</span>
                </div>
              </div>

              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {item.feishuRecordUrl && (
                  <a
                    href={item.feishuRecordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '7px 14px',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    开始验收 →
                  </a>
                )}
                <button
                  onClick={() => onToggleUrgent?.(item.id, !item.isUrgent)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: item.isUrgent ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.6)',
                    color: item.isUrgent ? '#E11D48' : '#64748B',
                    fontSize: 11,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {item.isUrgent ? '取消紧急' : '⏰ 标记紧急'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
