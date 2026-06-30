export default function StatsCards({ stats }) {
  const topError = stats.errorContentRanking?.[0];
  const cards = [
    {
      label: '总工单数',
      value: stats.totalCount ?? 0,
      note: '当前已分析工单总量'
    },
    {
      label: '高频出错内容',
      value: topError ? `${topError.count} 条` : '暂无',
      note: topError ? `Top 1：${topError.name}` : '暂无可展示高频内容'
    },
    {
      label: '需求不明确',
      value: `${stats.unclearCount ?? 0} 条`,
      note: `占比 ${stats.unclearRate ?? 0}%`,
      warning: (stats.unclearRate ?? 0) >= 20
    },
    {
      label: '疑似反复调整',
      value: `${stats.repeatedAdjustmentCandidateCount ?? 0} 条`,
      note: `占比 ${stats.repeatedAdjustmentRate ?? 0}%`,
      danger: (stats.repeatedAdjustmentCandidateCount ?? 0) > 0
    }
  ];

  return (
    <section className="stats-grid core-stats-grid">
      {cards.map((card) => (
        <div className={`stat-card ${card.danger ? 'danger-card' : ''} ${card.warning ? 'warning-card' : ''}`} key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <em>{card.note}</em>
        </div>
      ))}
    </section>
  );
}
