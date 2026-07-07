/**
 * Tab 1: 总览驾驶舱 — KPI 指标卡
 */
import { cmdColors } from '../charts/chartTheme.js';

function KpiCard({ label, value, sub, color, warn, danger }) {
  const accentColor = danger ? cmdColors.red : warn ? cmdColors.orange : color || cmdColors.brand;
  return (
    <div className="cc-kpi-card" style={{ borderLeftColor: accentColor }}>
      <span className="cc-kpi-label">{label}</span>
      <strong className="cc-kpi-value" style={{ color: danger ? cmdColors.red : warn ? cmdColors.orange : cmdColors.text }}>
        {value}
      </strong>
      {sub && <em className="cc-kpi-sub">{sub}</em>}
    </div>
  );
}

export default function KpiCards({ kpis }) {
  if (!kpis) return null;

  const cards = [
    {
      label: '总工单数',
      value: kpis.totalWorkorders ?? 0,
      sub: `有效分析 ${kpis.validWorkorders ?? 0} 条`,
      color: cmdColors.brand
    },
    {
      label: '完成率',
      value: `${kpis.completionRate ?? 0}%`,
      sub: kpis.completionRate >= 85 ? '状态良好' : kpis.completionRate >= 70 ? '需关注' : '需改进',
      color: cmdColors.green,
      warn: kpis.completionRate < 85,
      danger: kpis.completionRate < 70
    },
    {
      label: '待关闭工单',
      value: kpis.unclosedCount ?? 0,
      sub: kpis.unclosedCount > 30 ? '积压偏高' : '正常范围',
      color: cmdColors.orange,
      warn: (kpis.unclosedCount ?? 0) > 20,
      danger: (kpis.unclosedCount ?? 0) > 30
    },
    {
      label: '阻塞工单',
      value: kpis.blockedCount ?? 0,
      sub: (kpis.blockedCount ?? 0) > 0 ? '需要立即处理' : '无阻塞',
      color: cmdColors.red,
      danger: (kpis.blockedCount ?? 0) > 0
    },
    {
      label: '高龄工单(>5天)',
      value: kpis.agingCount ?? 0,
      sub: (kpis.agingCount ?? 0) > 10 ? '严重积压' : (kpis.agingCount ?? 0) > 5 ? '需关注' : '正常',
      color: cmdColors.red,
      warn: (kpis.agingCount ?? 0) > 5,
      danger: (kpis.agingCount ?? 0) > 10
    }
  ];

  return (
    <div className="cc-kpi-grid">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
