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
            {over7Count > 0 && <span style={{ color: '#d92d20', marginLeft: 12 }}>🚨 积压超 7 天：{over7Count} 条</span>}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1.5px solid ${sortBy === opt.key ? '#2878ff' : '#e2e8f0'}`,
              background: sortBy === opt.key ? '#ebf5ff' : '#fff',
              color: sortBy === opt.key ? '#2878ff' : '#64748b',
              fontSize: 13,
              fontWeight: sortBy === opt.key ? 600 : 400,
              cursor: 'pointer'
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
                borderRadius: 12,
                border: isOverdue ? '1.5px solid #fecaca' : '1px solid rgba(126,146,176,0.15)',
                background: isUrgent ? '#fff8f6' : '#fff',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start'
              }}
            >
              <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 40 }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: isOverdue ? '#d92d20' : '#2878ff',
                  lineHeight: 1.1
                }}>
                  {waitDays !== null ? waitDays : '?'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>天</div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <span className={`risk-tag risk-${item.riskLevel}`} style={{ fontSize: 11 }}>{item.riskLevel || '-'}风险</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{item.grade || '-'} / {item.week || '-'}</span>
                  {isOverdue && <span style={{ fontSize: 11, background: '#fee4e2', color: '#b42318', padding: '1px 6px', borderRadius: 4 }}>⚠ 超期</span>}
                  {isUrgent && <span style={{ fontSize: 11, background: '#d92d20', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>紧急</span>}
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#172033', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description || '未填写问题描述'}
                </p>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: '#2878ff',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    开始验收 →
                  </a>
                )}
                <button
                  onClick={() => onToggleUrgent?.(item.id, !item.isUrgent)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(126,146,176,0.2)',
                    background: item.isUrgent ? '#fee4e2' : '#fff',
                    color: item.isUrgent ? '#b42318' : '#64748b',
                    fontSize: 11,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
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
