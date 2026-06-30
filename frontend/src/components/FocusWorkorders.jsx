function formatArray(values) {
  return values?.length ? values.join('、') : '-';
}

function FocusCard({ item }) {
  return (
    <article className="focus-card">
      <div className="focus-card-top">
        <div className="focus-tags">
          <span className={`risk-tag risk-${item.riskLevel}`}>{item.riskLevel || '-'}</span>
          {item.isUnclearRequirement && <span className="tag warning">需求不明确</span>}
          {item.isRepeatedAdjustmentCandidate && <span className="tag danger">疑似反复调整</span>}
        </div>
        <span className="case-meta">{item.updatedAt || '未填写更新时间'}</span>
      </div>

      <p className="focus-description">{item.description || '未填写问题描述'}</p>

      <div className="focus-grid">
        <div>
          <span>课程定位</span>
          <strong>{item.coursePosition || '-'}</strong>
        </div>
        <div>
          <span>所属类型</span>
          <strong>{item.type || '-'}</strong>
        </div>
        <div>
          <span>问题分类</span>
          <strong>{item.issueCategory || '-'}</strong>
        </div>
        <div>
          <span>问题关键词</span>
          <strong>{formatArray(item.issueKeywords)}</strong>
        </div>
        <div>
          <span>不明确原因</span>
          <strong>{formatArray(item.unclearReasons)}</strong>
        </div>
        <div>
          <span>状态 / 负责人</span>
          <strong>{item.status || '-'} / {item.owner || '-'}</strong>
        </div>
      </div>

      <div className="focus-reasons">
        <p><b>风险原因：</b>{formatArray(item.riskReasons)}</p>
        <p><b>处理建议：</b>{formatArray(item.suggestions)}</p>
      </div>
    </article>
  );
}

export default function FocusWorkorders({ stats }) {
  const focusWorkorders = stats.focusWorkorders || [];

  return (
    <section className="panel focus-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Focus Workorders</p>
          <h2>重点工单列表</h2>
          <p className="muted">优先展示疑似反复调整、需求不明确、高风险和未完成工单；同一条工单只出现一次。</p>
        </div>
        <span className="count-badge">{focusWorkorders.length} 条</span>
      </div>
      <div className="focus-list">
        {focusWorkorders.length ? focusWorkorders.map((item) => <FocusCard item={item} key={item.id} />) : <div className="empty-state small-empty">暂无重点工单</div>}
      </div>
    </section>
  );
}
