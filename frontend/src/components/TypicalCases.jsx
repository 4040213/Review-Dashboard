const caseGroups = [
  {
    key: 'highRiskCases',
    title: '高风险典型案例',
    description: '优先关注风险等级为高的工单，尤其是未完成或描述不清的条目。'
  },
  {
    key: 'unclearCases',
    title: '需求不明确典型案例',
    description: '用于复盘需求表达是否存在范围过大、参考不清、单条多需求等问题。'
  },
  {
    key: 'repeatedAdjustmentCases',
    title: '反复调整候选案例',
    description: '用于定位可能反复沟通、重复修改或后续需要沉淀规范的工单。'
  }
];

function formatArray(value) {
  return value?.length ? value.join('、') : '-';
}

function CaseCard({ item }) {
  return (
    <article className="case-card">
      <div className="case-card-header">
        <span className={`risk-tag risk-${item.riskLevel}`}>{item.riskLevel || '-'}</span>
        <span className="case-meta">{item.owner || '未填写负责人'}</span>
      </div>
      <p className="case-description">{item.description || '未填写问题描述'}</p>
      <dl className="case-info">
        <div>
          <dt>年级/周次</dt>
          <dd>{[item.grade, item.week].filter(Boolean).join(' / ') || '-'}</dd>
        </div>
        <div>
          <dt>所属类型</dt>
          <dd>{item.type || '-'}</dd>
        </div>
        <div>
          <dt>问题分类</dt>
          <dd>{item.issueCategory || '-'}</dd>
        </div>
        <div>
          <dt>不明确原因</dt>
          <dd>{formatArray(item.unclearReasons)}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>{item.status || '-'}</dd>
        </div>
        <div>
          <dt>最后更新</dt>
          <dd>{item.updatedAt || '-'}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function TypicalCases({ stats }) {
  const typicalCases = stats.typicalCases || {};

  return (
    <section className="panel cases-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Review Cases</p>
          <h2>典型案例列表</h2>
          <p className="muted">自动挑选高风险、需求不明确和反复调整候选工单，方便暑期生产复盘时举例说明。</p>
        </div>
      </div>

      <div className="case-groups">
        {caseGroups.map((group) => {
          const cases = typicalCases[group.key] || [];

          return (
            <div className="case-group" key={group.key}>
              <div className="case-group-title">
                <h3>{group.title}</h3>
                <span>{cases.length} 条</span>
              </div>
              <p>{group.description}</p>
              <div className="case-list">
                {cases.length > 0 ? cases.map((item) => <CaseCard item={item} key={`${group.key}-${item.id}`} />) : <div className="empty-case">暂无典型案例</div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
