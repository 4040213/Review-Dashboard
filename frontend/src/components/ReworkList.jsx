function formatArray(values) {
  return values?.length ? values.join('、') : '-';
}

function daysBetween(dateStr) {
  if (!dateStr) return null;
  const diff = new Date() - new Date(dateStr);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function ReworkList({ data, workorders }) {
  const reworkItems = data?.length
    ? data
    : (workorders || []).filter((w) => w.isRepeatedAdjustmentCandidate && w.isValidForAnalysis);

  if (!reworkItems.length) {
    return (
      <div className="panel" style={{ marginTop: 12 }}>
        <div className="empty-state small-empty">暂无反复修改工单</div>
      </div>
    );
  }

  const sorted = [...reworkItems].sort((a, b) => {
    const aScore = (a.issueKeywords?.length || 0) + (a.unclearReasons?.length || 0);
    const bScore = (b.issueKeywords?.length || 0) + (b.unclearReasons?.length || 0);
    return bScore - aScore;
  });

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div className="section-heading" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 'var(--fs-h2)' }}>反复修改工单</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>按调整次数排序，优先关注需要多轮沟通的工单</p>
        </div>
        <span className="count-badge">{sorted.length} 条</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
        <div className="focus-list" style={{ gridTemplateColumns: '1fr' }}>
          {sorted.map((item) => {
          const reworkReasons = item.repeatedAdjustmentReasons || [];
          const rootCause = item.reworkRootCause || '';
          const rootCauseLabels = {
            unclear_requirement: '需求描述不清晰',
            unclear_acceptance: '验收标准不明确',
            execution_gap: '执行理解偏差',
            upstream_change: '上游依赖变更',
            batch_issue: '批量同类问题'
          };

          return (
            <article key={item.id} className="focus-card" style={{ borderLeft: '3px solid var(--red)' }}>
              <div className="focus-card-top">
                <div className="focus-tags">
                  <span className={`risk-tag risk-${item.riskLevel}`}>{item.riskLevel || '-'}</span>
                  {item.isUnclearRequirement && <span className="tag warning">需求不明确</span>}
                  {rootCause && (
                    <span className="tag" style={{ background: 'rgba(222,16,32,0.08)', color: 'var(--red-dark)' }}>
                      {rootCauseLabels[rootCause] || rootCause}
                    </span>
                  )}
                </div>
                <span className="case-meta">{item.updatedAt || '未填写更新时间'}</span>
              </div>

              <p className="focus-description">{item.description || '未填写问题描述'}</p>

              <div className="focus-grid">
                <div><span>课程定位</span><strong>{item.coursePosition || '-'}</strong></div>
                <div><span>所属类型</span><strong>{item.type || '-'}</strong></div>
                <div><span>状态</span><strong>{item.status || '-'}</strong></div>
                <div><span>年级/周次</span><strong>{[item.grade, item.week].filter(Boolean).join(' / ') || '-'}</strong></div>
                <div><span>负责人</span><strong>{item.owner || '-'}</strong></div>
                <div><span>问题关键词</span><strong>{formatArray(item.issueKeywords)}</strong></div>
              </div>

              <div className="focus-reasons">
                <p><b>反复调整原因：</b>{reworkReasons.length ? reworkReasons.join('；') : '未填写'}</p>
                {rootCause && (
                  <p><b>推断根因：</b>{rootCauseLabels[rootCause] || rootCause}{item.reworkRootCauseReason ? `（${item.reworkRootCauseReason}）` : ''}</p>
                )}
                <p><b>处理建议：</b>{formatArray(item.suggestions)}</p>
              </div>

              {/* Simple timeline from status timestamps */}
              {(item.submittedAt || item.resolvedAt || item.acceptedAt || item.archivedAt) && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(248,250,252,0.6)', borderRadius: 8, fontSize: 'var(--fs-caption)', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>📅 时间线：</span>
                  {item.submittedAt && <span>提交 {new Date(item.submittedAt).toLocaleDateString('zh-CN')}</span>}
                  {item.resolvedAt && <span style={{ marginLeft: 8 }}>→ 解决 {new Date(item.resolvedAt).toLocaleDateString('zh-CN')}</span>}
                  {item.acceptedAt && <span style={{ marginLeft: 8 }}>→ 验收 {new Date(item.acceptedAt).toLocaleDateString('zh-CN')}</span>}
                  {item.archivedAt && <span style={{ marginLeft: 8 }}>→ 归档 {new Date(item.archivedAt).toLocaleDateString('zh-CN')}</span>}
                </div>
              )}
            </article>
          );
        })}
        </div>
      </div>
    </div>
  );
}
