import { useState } from 'react';

const INVALID_TYPE_LABELS = {
  collaboration_placeholder: { label: '协作占位', desc: '组课文档等多人协作中间产物，非真实问题工单', color: 'var(--brand)' },
  test_data: { label: '测试数据', desc: '测试或调试用占位数据', color: 'var(--gold)' },
  blank: { label: '空白/无效', desc: '描述为空或仅为占位符（如"-""/""无"）', color: 'var(--text-muted)' },
  incomplete: { label: '信息不完整', desc: '核心字段缺失或描述过短无法分类', color: 'var(--red)' }
};

function InvalidGroup({ type, workorders, counts }) {
  const [collapsed, setCollapsed] = useState(false);
  const info = INVALID_TYPE_LABELS[type] || { label: type, desc: '', color: 'var(--text-secondary)' };
  const count = counts[type] || 0;

  if (count === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'rgba(248,250,252,0.6)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          cursor: 'pointer',
          borderLeft: `3px solid ${info.color}`
        }}
      >
        <span style={{ fontSize: 'var(--fs-h1)' }}>{collapsed ? '▶' : '▼'}</span>
        <span style={{ fontWeight: 600, fontSize: 'var(--fs-body)', color: 'var(--text-primary)', flex: 1 }}>{info.label}</span>
        <span className="count-badge">{count} 条</span>
      </div>
      {!collapsed && (
        <div style={{ padding: '8px 14px 0' }}>
          <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)', margin: '0 0 8px' }}>{info.desc}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {workorders.filter((w) => w.invalidType === type).slice(0, 20).map((w) => (
              <div
                key={w.id}
                style={{
                  fontSize: 'var(--fs-body-sm)',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.6)',
                  borderRadius: 6,
                  border: '1px solid rgba(148,163,184,0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.description || <em style={{ color: 'var(--text-muted)' }}>无描述</em>}
                </span>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 'var(--fs-overline)' }}>
                  {w.type || '-'} · {w.grade || '-'} {w.week || ''}
                </span>
              </div>
            ))}
            {count > 20 && <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--text-muted)', textAlign: 'center' }}>还有 {count - 20} 条未显示...</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvalidList({ data, workorders }) {
  const invalidItems = data?.length
    ? data
    : (workorders || []).filter((w) => !w.isValidForAnalysis);

  if (!invalidItems.length) {
    return (
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="empty-state small-empty">暂无不合格工单</div>
      </div>
    );
  }

  const counts = {};
  invalidItems.forEach((w) => {
    const type = w.invalidType || 'incomplete';
    counts[type] = (counts[type] || 0) + 1;
  });

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="section-heading" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-h2)' }}>不合格工单</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            共 {invalidItems.length} 条工单未进入核心分析（含协作占位、测试数据、空白无效、信息不完整）
          </p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
        {Object.keys(INVALID_TYPE_LABELS).map((type) => (
          <InvalidGroup key={type} type={type} workorders={invalidItems} counts={counts} />
        ))}

        {/* Fallback for items without a typed invalidType */}
        {invalidItems.filter((w) => !INVALID_TYPE_LABELS[w.invalidType]).length > 0 && (
          <InvalidGroup
            type="incomplete"
            workorders={invalidItems}
            counts={{ incomplete: invalidItems.filter((w) => !INVALID_TYPE_LABELS[w.invalidType]).length }}
          />
        )}
      </div>
    </div>
  );
}
