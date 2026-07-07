/**
 * 高频出错排名列表 — 静态排名 + 进度条
 */
export default function ErrorRanking({ items = [], onItemClick, maxItems = 5 }) {
  const top = items.slice(0, maxItems);
  const maxCount = top.length > 0 ? top[0].count : 1;

  if (!top.length) {
    return (
      <div className="panel">
        <div className="panel-hd">
          <span className="ph-t"><span className="ph-dot" style={{ background: 'var(--red)' }} />高频出错 Top {maxItems}</span>
        </div>
        <div className="panel-bd">
          <div className="empty-state small-empty" style={{ padding: 16, fontSize: 'var(--fs-body-sm)' }}>暂无高频出错内容</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-hd">
        <span className="ph-t"><span className="ph-dot" style={{ background: 'var(--red)' }} />高频出错 Top {maxItems}</span>
        <span className="ph-a">查看全部 →</span>
      </div>
      <div className="panel-bd">
        <div className="rank-list">
          {top.map((item, i) => (
            <div
              key={item.name || i}
              className="rank-item"
              onClick={() => onItemClick?.(item, i)}
            >
              <span className="rk-num">{i + 1}</span>
              <span className="rk-info">
                <span className="rk-name">{item.name}</span>
                <span className="rk-meta">
                  {item.examples?.[0]?.issueKeywords?.slice(0, 3).join(' · ') || ''}
                </span>
              </span>
              <span className="rk-bar">
                <span
                  className="rk-bar-fill"
                  style={{
                    width: `${Math.round((item.count / maxCount) * 100)}%`,
                    background: i === 0
                      ? 'linear-gradient(to right, var(--red), var(--brand-light))'
                      : i === 1
                        ? 'linear-gradient(to right, var(--gold), #E89040)'
                        : i === 2
                          ? 'linear-gradient(to right, var(--gold), #E89040)'
                          : 'var(--text-muted)'
                  }}
                />
              </span>
              <span className="rk-val">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
