/**
 * 生产指挥舱 — 顶部标签页导航
 */

const TABS = [
  { key: 'overview', label: '总览驾驶舱', icon: '📊', desc: 'Executive Dashboard' },
  { key: 'diagnostics', label: '深度诊断', icon: '🔍', desc: 'Deep Dive Analytics' },
  { key: 'tasklist', label: '待办工单清单', icon: '📋', desc: 'Actionable Task List' },
  { key: 'forecast', label: '预测与趋势', icon: '📈', desc: 'Forecast & Trend' }
];

export default function TabNavigation({ activeTab, onTabChange, badgeCounts = {} }) {
  return (
    <nav className="command-tab-bar">
      {TABS.map((tab) => {
        const badge = badgeCounts[tab.key];
        return (
          <button
            key={tab.key}
            className={`command-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
            title={tab.desc}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {badge != null && badge > 0 && (
              <span className="tab-badge">{badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
