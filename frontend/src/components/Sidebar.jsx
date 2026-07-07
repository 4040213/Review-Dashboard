import { Icon } from '@iconify/react';

/**
 * 雪球课堂 · 侧边栏导航
 */
export default function Sidebar({ activeView, onNavigate, onAction }) {
  const navGroups = [
    {
      items: [
        { id: 'legacy',  icon: 'mdi:view-dashboard-outline', label: '数据看板' },
        { id: 'command', icon: 'mdi:chart-timeline-variant', label: '生产指挥舱', badge: '4' },
        { id: 'profile', icon: 'mdi:account-circle-outline', label: '个人主页' },
      ],
    },
    {
      items: [
        { id: 'import',  icon: 'mdi:file-import-outline', label: '数据导入' },
        { id: 'feishu',  icon: 'mdi:sync-circle', label: '飞书同步' },
        { id: 'rules',   icon: 'mdi:cog-outline', label: '分类规则' },
      ],
    },
    {
      items: [
        { id: 'export',  icon: 'mdi:file-export-outline', label: '导出报告', action: true },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img className="sidebar-logo-img" src="/logo.png" alt="雪球课堂" />
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">雪球课堂</div>
          <div className="sidebar-logo-sub">XUEQIU CLASSROOM</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div className="sidebar-divider" />}
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`sidebar-item${activeView === item.id ? ' active' : ''}`}
                onClick={() => item.action && onAction ? onAction(item.id) : onNavigate(item.id)}
              >
                <Icon icon={item.icon} width={20} height={20} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="sidebar-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer — click to profile */}
      <div className="sidebar-footer" onClick={() => onNavigate('profile')} style={{cursor:'pointer'}} title="查看个人主页">
        <div className="sidebar-avatar">李</div>
        <div className="sidebar-footer-info">
          <div className="sidebar-user-name">李明</div>
          <div className="sidebar-user-role">教研管理员</div>
        </div>
      </div>
    </aside>
  );
}
