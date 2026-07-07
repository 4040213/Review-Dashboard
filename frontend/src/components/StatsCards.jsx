export default function StatsCards({ stats, onFilterChange }) {
  const totalRaw = stats.totalRawCount ?? stats.totalCount ?? 0;
  const validCount = stats.validAnalysisCount ?? 0;
  const unclearCount = stats.unclearCount ?? 0;
  const unclearRate = stats.unclearRate ?? 0;
  const repeatedCount = stats.repeatedCandidateCount ?? stats.repeatedAdjustmentCandidateCount ?? 0;
  const repeatedRate = stats.repeatedAdjustmentRate ?? 0;
  const highRiskCount = stats.highRiskCount ?? 0;
  const archiveRate = stats.archiveRate ?? 0;
  const passRate = stats.passRate ?? null;

  function handleCardClick(type) {
    if (type === 'totalValid') {
      onFilterChange?.({ type: 'scope', value: 'valid', label: '有效分析工单' });
    } else if (type === 'unclear') {
      onFilterChange?.({ type: 'isUnclearRequirement', value: true, label: '需求不明确工单' });
    } else if (type === 'repeated') {
      onFilterChange?.({ type: 'isRepeatedAdjustment', value: true, label: '疑似反复调整工单' });
    } else if (type === 'highRisk') {
      onFilterChange?.({ type: 'riskLevel', value: '高', label: '高风险工单' });
    }
  }

  const cards = [
    {
      label: '总工单',
      value: totalRaw,
      sub: `有效分析 ${validCount} 条`,
      clickable: true,
      onClickType: 'totalValid',
      accent: 'var(--brand)'
    },
    {
      label: '归档率',
      value: `${archiveRate}%`,
      sub: `${stats.archivedCount ?? 0} 条已归档 · ${stats.unfinishedCount ?? 0} 条未完成`,
      clickable: false,
      accent: 'var(--green)',
      warn: (stats.unfinishedCount ?? 0) > 0
    },
    {
      label: '验收通过率',
      value: passRate !== null ? `${passRate}%` : '—',
      sub: passRate !== null ? `${stats.passTotal ?? 0} 条验收` : '需时间字段数据',
      clickable: false,
      accent: 'var(--teal)'
    },
    {
      label: '需求不明确',
      value: `${unclearCount} 条`,
      sub: `占有效工单 ${unclearRate}%`,
      clickable: true,
      onClickType: 'unclear',
      accent: 'var(--gold)',
      warn: unclearRate >= 20
    },
    {
      label: '高风险 / 反复调整',
      value: `${highRiskCount} / ${repeatedCount}`,
      sub: `反复调整占比 ${repeatedRate}%`,
      clickable: true,
      onClickType: 'highRisk',
      accent: 'var(--red)',
      danger: highRiskCount > 0
    }
  ];

  return (
    <section className="stats-grid core-stats-grid five-stats-grid">
      {cards.map((card) => (
        <div
          className={`stat-card ${card.danger ? 'danger-card' : ''} ${card.warn ? 'warning-card' : ''} ${card.clickable ? 'clickable-stat-card' : ''}`}
          key={card.label}
          onClick={card.clickable ? () => handleCardClick(card.onClickType) : undefined}
          style={card.clickable ? { cursor: 'pointer' } : undefined}
        >
          <span>{card.label}</span>
          <strong style={card.danger ? { color: 'var(--red-dark)' } : card.warn ? { color: 'var(--gold)' } : { color: 'var(--text-primary)' }}>{card.value}</strong>
          <em>{card.sub}</em>
        </div>
      ))}
    </section>
  );
}
