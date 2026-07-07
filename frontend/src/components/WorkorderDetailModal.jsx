import { useEffect } from 'react';

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.join('、') : '-';
  return String(value);
}

export default function WorkorderDetailModal({ workorder, onClose }) {
  // ESC key to close
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!workorder) return null;

  const fields = [
    { label: '风险等级', value: workorder.riskLevel, isRisk: true },
    { label: '课程定位', value: workorder.coursePosition },
    { label: '年级', value: workorder.grade },
    { label: '周', value: workorder.week },
    { label: '所属类型', value: workorder.type },
    { label: '问题一级分类', value: workorder.issueCategory },
    { label: '问题关键词', value: workorder.issueKeywords },
    { label: '是否需求不明确', value: workorder.isUnclearRequirement ? '是' : '否' },
    { label: '不明确原因', value: workorder.unclearReasons },
    { label: '是否疑似反复调整', value: workorder.isRepeatedAdjustmentCandidate ? '是' : '否' },
    { label: '反复调整原因', value: workorder.repeatedAdjustmentReasons },
    { label: '状态', value: workorder.status },
    { label: '负责人', value: workorder.owner },
    { label: '教研负责人', value: workorder.researcher },
    { label: '最后更新时间', value: workorder.updatedAt },
    { label: '工单提出时间', value: workorder.submittedAt },
    { label: '无效类型', value: workorder.invalidType },
    { label: '推断根因', value: workorder.reworkRootCause }
  ];

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="detail-modal-header">
          <div>
            <h2>工单详情</h2>
            <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-body-sm)' }}>只读查看，不提供编辑功能</p>
          </div>
          <button className="detail-modal-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="detail-modal-body">
          {/* Risk & Status tags */}
          <div className="detail-tags-row">
            <span className={`risk-tag risk-${workorder.riskLevel}`}>{workorder.riskLevel || '-'} 风险</span>
            {workorder.isUnclearRequirement && <span className="tag warning">需求不明确</span>}
            {workorder.isRepeatedAdjustmentCandidate && <span className="tag danger">疑似反复调整</span>}
            {workorder.isUrgent && <span className="tag danger">紧急</span>}
          </div>

          {/* Description */}
          <div className="detail-section">
            <h3>问题描述</h3>
            <p className="detail-description">{workorder.description || '未填写问题描述'}</p>
          </div>

          {/* Fields grid */}
          <div className="detail-section">
            <h3>工单信息</h3>
            <dl className="detail-fields-grid">
              {fields.map((field) => (
                <div key={field.label} className="detail-field-item">
                  <dt>{field.label}</dt>
                  <dd className={field.isRisk ? `detail-risk-value risk-${workorder.riskLevel}` : ''}>
                    {field.isRisk ? <span className={`risk-tag risk-${workorder.riskLevel}`} style={{ fontSize: 'var(--fs-body-sm)' }}>{formatValue(field.value)}</span> : formatValue(field.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Risk reasons */}
          {workorder.riskReasons?.length > 0 && (
            <div className="detail-section">
              <h3>风险原因</h3>
              <ul className="detail-list">
                {workorder.riskReasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {workorder.suggestions?.length > 0 && (
            <div className="detail-section">
              <h3>处理建议</h3>
              <ul className="detail-list suggestions">
                {workorder.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Timeline */}
          {(workorder.submittedAt || workorder.resolvedAt || workorder.acceptedAt || workorder.archivedAt) && (
            <div className="detail-section">
              <h3>时间线</h3>
              <div className="detail-timeline">
                {workorder.submittedAt && (
                  <div className="timeline-step">
                    <span className="timeline-dot submitted" />
                    <span className="timeline-label">提交</span>
                    <span className="timeline-date">{new Date(workorder.submittedAt).toLocaleString('zh-CN')}</span>
                  </div>
                )}
                {workorder.resolvedAt && (
                  <div className="timeline-step">
                    <span className="timeline-dot resolved" />
                    <span className="timeline-label">解决</span>
                    <span className="timeline-date">{new Date(workorder.resolvedAt).toLocaleString('zh-CN')}</span>
                  </div>
                )}
                {workorder.acceptedAt && (
                  <div className="timeline-step">
                    <span className="timeline-dot accepted" />
                    <span className="timeline-label">验收</span>
                    <span className="timeline-date">{new Date(workorder.acceptedAt).toLocaleString('zh-CN')}</span>
                  </div>
                )}
                {workorder.archivedAt && (
                  <div className="timeline-step">
                    <span className="timeline-dot archived" />
                    <span className="timeline-label">归档</span>
                    <span className="timeline-date">{new Date(workorder.archivedAt).toLocaleString('zh-CN')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
