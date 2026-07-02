function formatList(values) {
  if (!values?.length) return '未填写';
  return values.slice(0, 8).join('、');
}

export default function ErrorDetailModal({ item, onClose, onViewExample }) {
  if (!item) return null;

  const examples = item.examples || [];

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()} style={{ width: 680 }}>
        <div className="detail-modal-header">
          <div>
            <h2>{item.name}</h2>
            <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 13 }}>
              共 {item.count} 条 · 占比 {item.percent}%
            </p>
          </div>
          <button className="detail-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="detail-modal-body">
          {/* Summary */}
          <div className="detail-section">
            <h3>汇总信息</h3>
            <div className="detail-fields-grid">
              <div className="detail-field-item">
                <dt>出现次数</dt>
                <dd>{item.count} 条</dd>
              </div>
              <div className="detail-field-item">
                <dt>占有效工单比例</dt>
                <dd>{item.percent}%</dd>
              </div>
              <div className="detail-field-item">
                <dt>涉及年级</dt>
                <dd>{formatList(item.grades)}</dd>
              </div>
              <div className="detail-field-item">
                <dt>高发周次</dt>
                <dd>{formatList(item.weeks)}</dd>
              </div>
            </div>
          </div>

          {/* Example Cases */}
          {examples.length > 0 && (
            <div className="detail-section">
              <h3>代表案例（{examples.length} 条）</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {examples.map((example, idx) => (
                  <div
                    key={idx}
                    className="case-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewExample?.(example)}
                  >
                    <div className="case-card-header">
                      <span className={`risk-tag risk-${example.riskLevel || '低'}`}>
                        {example.riskLevel || '低'}风险
                      </span>
                      <span className="case-meta">
                        {example.grade || '-'} / {example.week || '-'} · {example.owner || '-'}
                      </span>
                    </div>
                    <p className="case-description" style={{ minHeight: 0, margin: '8px 0 0' }}>
                      {example.description || '未填写问题描述'}
                    </p>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                      关键词：{formatList(example.issueKeywords)}
                      {example.status ? ` · 状态：${example.status}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {examples.length === 0 && (
            <div className="empty-state" style={{ padding: 24 }}>
              暂无代表案例数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
