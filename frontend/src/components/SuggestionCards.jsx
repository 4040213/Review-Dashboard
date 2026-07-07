/**
 * 改进建议面板
 */
export default function SuggestionCards({ suggestions = [] }) {
  if (!suggestions.length) {
    return (
      <div className="panel">
        <div className="panel-hd">
          <span className="ph-t"><span className="ph-dot" style={{ background: 'var(--purple)' }} />改进建议</span>
        </div>
        <div className="panel-bd">
          <div className="empty-state small-empty" style={{ padding: 16, fontSize: 'var(--fs-body-sm)' }}>暂无明显风险建议</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-hd">
        <span className="ph-t"><span className="ph-dot" style={{ background: 'var(--purple)' }} />改进建议</span>
        <span className="ph-a">AI 分析</span>
      </div>
      <div className="panel-bd">
        <div className="info-cards">
          {suggestions.map((s, i) => (
            <div key={i} className="info-card">
              <div className="ic-t">{s.title || `建议 ${i + 1}`}</div>
              <div className="ic-b" dangerouslySetInnerHTML={{ __html: s.body }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
