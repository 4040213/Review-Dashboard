export default function StatsCards({ stats }) {
  const cards = [
    { label: '总记录数', value: stats.totalRawCount ?? stats.totalCount ?? 0, note: 'Excel 原始解析记录' },
    { label: '有效分析工单', value: stats.validAnalysisCount ?? 0, note: '进入核心分析的工单' },
    { label: '需求不明确', value: `${stats.unclearCount ?? 0} 条`, note: `占比 ${stats.unclearRate ?? 0}%`, warning: (stats.unclearRate ?? 0) >= 20 },
    { label: '疑似反复调整', value: `${stats.repeatedCandidateCount ?? stats.repeatedAdjustmentCandidateCount ?? 0} 条`, note: `占比 ${stats.repeatedAdjustmentRate ?? 0}%`, danger: (stats.repeatedCandidateCount ?? stats.repeatedAdjustmentCandidateCount ?? 0) > 0 },
    { label: '未归档工单', value: `${stats.unfinishedCount ?? 0} 条`, note: `归档率 ${stats.archiveRate ?? 0}%`, warning: (stats.unfinishedCount ?? 0) > 0 }
  ];

  return (
    <section className="stats-grid core-stats-grid five-stats-grid">
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
