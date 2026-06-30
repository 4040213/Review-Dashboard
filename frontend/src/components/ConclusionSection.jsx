function getExampleText(item) {
  const example = item.examples?.[0];
  return example?.description || '暂无代表案例';
}

function formatList(values) {
  if (!values?.length) return '未填写';
  return values.slice(0, 5).join('、');
}

function RankingItem({ item, index, type = 'error' }) {
  const title = type === 'unclear' ? item.reason || item.name : item.name;
  const keywords = item.examples?.flatMap((example) => example.issueKeywords || []).filter(Boolean) || [];

  return (
    <article className="ranking-item">
      <div className="ranking-index">TOP {index + 1}</div>
      <div className="ranking-body">
        <div className="ranking-title-row">
          <h3>{title}</h3>
          <strong>{item.count} 条</strong>
        </div>
        <p className="ranking-percent">占比 {item.percent}%</p>
        {type === 'error' ? (
          <div className="ranking-meta">
            <span>涉及：{formatList(item.grades)}</span>
            <span>高发周次：{formatList(item.weeks)}</span>
          </div>
        ) : (
          <div className="ranking-meta">
            <span>典型关键词：{formatList([...new Set(keywords)].slice(0, 6))}</span>
          </div>
        )}
        <p className="ranking-example">代表案例：{getExampleText(item)}</p>
      </div>
    </article>
  );
}

export default function ConclusionSection({ stats }) {
  const errorTop5 = stats.errorContentRanking?.slice(0, 5) || [];
  const unclearTop = stats.unclearReasonRanking?.slice(0, 3) || [];
  const repeatedTop = stats.repeatedAdjustmentRanking?.slice(0, 2) || [];
  const combinedRiskTop = [
    ...unclearTop.map((item) => ({ ...item, type: 'unclear' })),
    ...repeatedTop.map((item) => ({ ...item, type: 'repeated' }))
  ].slice(0, 5);

  return (
    <section className="conclusion-grid">
      <div className="panel conclusion-panel">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Key Finding</p>
            <h2>高频出错内容 Top5</h2>
            <p className="muted">按“所属类型 + 问题一级分类 + 问题关键词”聚合，展示最常出现的问题内容。</p>
          </div>
        </div>
        {stats.classificationWarning && <div className="warning-note">{stats.classificationWarning}</div>}
        <div className="ranking-list">
          {errorTop5.length ? errorTop5.map((item, index) => <RankingItem item={item} index={index} key={item.name} />) : <div className="empty-state small-empty">暂无高频出错内容</div>}
        </div>
      </div>

      <div className="panel conclusion-panel">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Risk Finding</p>
            <h2>需求不明确与反复调整 Top5</h2>
            <p className="muted">展示最容易造成沟通成本和返工风险的工单类型。</p>
          </div>
        </div>
        <div className="ranking-list">
          {combinedRiskTop.length ? (
            combinedRiskTop.map((item, index) => <RankingItem item={item} index={index} key={`${item.type}-${item.name || item.reason}`} type="unclear" />)
          ) : (
            <div className="empty-state small-empty">暂无需求不明确或反复调整数据</div>
          )}
        </div>
      </div>
    </section>
  );
}
