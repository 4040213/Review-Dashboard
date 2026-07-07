import { Icon } from '@iconify/react';

/**
 * 新版 KPI 指标卡 — 6列布局，品牌色图标 + 趋势指示
 */
export default function KpiCardsNew({ stats, onFilterChange }) {
  const totalRaw = stats.totalRawCount ?? stats.totalCount ?? 0;
  const validCount = stats.validAnalysisCount ?? 0;
  const invalidCount = stats.invalidAnalysisCount ?? 0;
  const unclearCount = stats.unclearCount ?? 0;
  const unclearRate = stats.unclearRate ?? 0;
  const repeatedCount = stats.repeatedCandidateCount ?? stats.repeatedAdjustmentCandidateCount ?? 0;
  const repeatedRate = stats.repeatedAdjustmentRate ?? 0;
  const highRiskCount = stats.highRiskCount ?? 0;
  const archiveRate = stats.archiveRate ?? 0;
  const passRate = stats.passRate ?? null;
  const completionRate = stats.completionRate ?? 0;
  const unfinishedCount = stats.unfinishedCount ?? 0;

  function handleClick(type) {
    switch (type) {
      case 'total':
        onFilterChange?.({ type: 'scope', value: 'valid', label: '有效分析工单' });
        break;
      case 'unclear':
        onFilterChange?.({ type: 'isUnclearRequirement', value: true, label: '需求不明确工单' });
        break;
      case 'repeated':
        onFilterChange?.({ type: 'isRepeatedAdjustment', value: true, label: '疑似反复调整工单' });
        break;
      case 'highRisk':
        onFilterChange?.({ type: 'riskLevel', value: '高', label: '高风险工单' });
        break;
    }
  }

  const cards = [
    {
      label: '工单总数', value: totalRaw, icon: 'mdi:package-variant-closed', color: 'brand',
      trend: '▲', trendLabel: '加载中', trendClass: 'up',
      sub: `有效分析 ${validCount} · 无效 ${invalidCount}`,
      clickable: true, clickType: 'total'
    },
    {
      label: '归档完成率', value: `${archiveRate}%`, icon: 'mdi:check-circle-outline', color: 'green',
      trend: unfinishedCount > 0 ? '●' : '▲', trendLabel: unfinishedCount > 0 ? '进行中' : '良好',
      trendClass: unfinishedCount > 0 ? 'flat' : 'up',
      sub: `已归档 ${stats.archivedCount ?? 0} · 进行中 ${unfinishedCount}`,
      warn: unfinishedCount > 50, danger: false
    },
    {
      label: '验收通过率', value: passRate !== null ? `${passRate}%` : '—', icon: 'mdi:clipboard-check-outline', color: 'teal',
      trend: '▲', trendLabel: '良好', trendClass: 'up',
      sub: passRate !== null ? `${stats.passTotal ?? 0} 条验收` : '需时间字段数据',
      warn: false, danger: false
    },
    {
      label: '需求不明确', value: `${unclearCount} 条`, icon: 'mdi:help-circle-outline', color: 'gold',
      trend: unclearRate >= 20 ? '●' : '▼', trendLabel: unclearRate >= 20 ? '偏高' : '改善',
      trendClass: unclearRate >= 20 ? 'flat' : 'down',
      sub: `占有效工单 ${unclearRate}%`,
      clickable: true, clickType: 'unclear',
      warn: unclearRate >= 20, danger: false
    },
    {
      label: '阻塞 & 高风险', value: `${highRiskCount}`, icon: 'mdi:alert-circle-outline', color: 'red',
      trend: highRiskCount > 5 ? '●' : '▼', trendLabel: highRiskCount > 5 ? '需关注' : '减少',
      trendClass: highRiskCount > 5 ? 'flat' : 'down',
      sub: `反复调整 ${repeatedCount} 条 (${repeatedRate}%)`,
      clickable: true, clickType: 'highRisk',
      warn: false, danger: highRiskCount > 0
    },
    {
      label: '待关闭工单', value: `${completionRate}%`, icon: 'mdi:progress-clock', color: 'purple',
      trend: completionRate >= 85 ? '▲' : completionRate >= 70 ? '●' : '▼',
      trendLabel: completionRate >= 85 ? '健康' : completionRate >= 70 ? '一般' : '偏低',
      trendClass: completionRate >= 85 ? 'up' : completionRate >= 70 ? 'flat' : 'down',
      sub: `完成率 ${completionRate}%`,
      warn: false, danger: false
    },
  ];

  return (
    <div className="kpi-grid-new">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`kpi-card-new ${card.color}${card.danger ? ' danger' : ''}${card.warn ? ' warn' : ''}`}
          onClick={card.clickable ? () => handleClick(card.clickType) : undefined}
        >
          <div className="kc-head">
            <span className={`kc-icon ${card.color}`}>
              <Icon icon={card.icon} width={20} height={20} />
            </span>
            <span className={`kc-trend ${card.trendClass}`}>
              {card.trend} {card.trendLabel}
            </span>
          </div>
          <span className="kc-val">{card.value}</span>
          <span className="kc-label">{card.label}</span>
          <span className="kc-sub">{card.sub}</span>
        </div>
      ))}
    </div>
  );
}
