import { useState, useEffect } from 'react';
import CarouselSection from './CarouselSection.jsx';
import { statusColors } from './charts/chartTheme.js';

function getExampleText(item) {
  const example = item.examples?.[0];
  return example?.description || '暂无代表案例';
}

function formatList(values) {
  if (!values?.length) return '未填写';
  return values.slice(0, 5).join('、');
}

export default function LeftConclusionPanel({ stats, onFilterChange, activeFilter }) {
  const [activeSection, setActiveSection] = useState(null);
  const [activeItemKey, setActiveItemKey] = useState(null);

  const groupMap = new Map((stats.statusGroupRanking || []).map((item) => [item.group || item.name, item]));
  const totalValid = stats.validAnalysisCount || 0;
  const suspendedCount = groupMap.get('暂停/挂起')?.count || 0;

  // Default select Top1 error on load
  useEffect(() => {
    const topError = stats.errorContentRanking?.[0];
    if (topError && !activeItemKey) {
      setActiveSection('error');
      setActiveItemKey(topError.name);
      onFilterChange?.({ type: 'errorContent', value: topError.name, label: topError.name });
    }
  }, [stats.errorContentRanking?.[0]?.name]);

  function handleClick(section, item) {
    const key = item.name || item.reason || '';
    setActiveSection(section);
    setActiveItemKey(key);
    onFilterChange?.({ type: section, value: key, label: key, keywords: item.examples?.flatMap((e) => e.issueKeywords || []) || [] });
  }

  function handleStatusGroupClick(group) {
    setActiveSection('status');
    setActiveItemKey(group);
    onFilterChange?.({ type: 'statusGroup', value: group, label: group });
  }

  function handleUnclearReasonClick(item) {
    setActiveSection('unclear');
    setActiveItemKey(item.reason || item.name);
    onFilterChange?.({ type: 'unclearReason', value: item.reason || item.name, label: item.reason || item.name });
  }

  const errorTop5 = stats.errorContentRanking?.slice(0, 5) || [];
  const unclearTop3 = stats.unclearReasonRanking?.slice(0, 3) || [];
  const reworkTop = stats.repeatedAdjustmentRanking?.slice(0, 3) || [];

  // Build summary for rework root causes
  const reworkCauses = [];
  if (stats.repeatedAdjustmentCandidateCount > 0) {
    if ((stats.unclearRate ?? 0) >= 15) reworkCauses.push({ label: '需求描述不清晰', count: stats.unclearCount });
    reworkCauses.push({ label: '批量同类问题', count: stats.repeatedAdjustmentCandidateCount });
  }

  // Build suggestions
  const suggestions = [];
  const topError = errorTop5[0];
  if (topError) {
    suggestions.push(`针对「${topError.name}」建立专项检查清单，当前 ${topError.count} 条，占比 ${topError.percent}%。`);
  }
  if ((stats.unclearRate ?? 0) >= 20) {
    suggestions.push(`需求不明确占比 ${stats.unclearRate}%，建议在提单阶段增加范围、参考链接和验收标准要求。`);
  }
  if ((stats.repeatedAdjustmentCandidateCount ?? 0) > 0) {
    suggestions.push(`存在 ${stats.repeatedAdjustmentCandidateCount} 条疑似反复调整工单，建议复盘需求表达或验收口径。`);
  }
  if (suspendedCount > 0) {
    suggestions.push(`当前有 ${suspendedCount} 条暂停/挂起工单不计入分析，建议定期清理或重新激活。`);
  }

  const statusOrder = ['已归档', '待验收', '处理中', '暂停/挂起'];

  return (
    <div className="left-conclusion-panel">

      {/* Status Distribution */}
      <section className="conclusion-section">
        <div className="section-title">📊 状态分布</div>
        <div className="compact-status-bar">
          {statusOrder.map((group) => {
            const count = groupMap.get(group)?.count || 0;
            const pct = totalValid > 0 ? (count / totalValid * 100) : 0;
            return pct > 0 ? (
              <div
                key={group}
                className="status-segment"
                style={{ width: `${pct}%`, backgroundColor: statusColors[group] || '#cbd5e1' }}
                title={`${group}: ${count} 条 (${Math.round(pct)}%)`}
                onClick={() => handleStatusGroupClick(group)}
              />
            ) : null;
          })}
        </div>
        <div className="compact-status-legend">
          {statusOrder.map((group) => (
            <span
              key={group}
              className={`legend-item ${activeSection === 'status' && activeItemKey === group ? 'active' : ''}`}
              onClick={() => handleStatusGroupClick(group)}
            >
              <span className="legend-dot" style={{ backgroundColor: statusColors[group] || '#cbd5e1' }} />
              {group} {groupMap.get(group)?.count || 0}
            </span>
          ))}
        </div>
      </section>

      {/* High-Frequency Error Top 5 — Carousel */}
      {stats.classificationWarning && (
        <div className="warning-note" style={{ fontSize: 12, padding: '6px 10px', marginBottom: 4 }}>{stats.classificationWarning}</div>
      )}

      <CarouselSection
        title="🔴 高频出错内容 Top5"
        subtitle="按「所属类型 + 问题一级分类 + 问题关键词」聚合"
        items={errorTop5}
        autoPlay={errorTop5.length > 2}
        interval={3500}
        visibleCount={1}
        cardGap={16}
        pauseOnHover={true}
        loop={true}
        renderItem={(item, index) => {
          const isActive = activeSection === 'error' && activeItemKey === item.name;
          return (
            <div
              className={`carousel-error-card ${isActive ? 'active-card' : ''}`}
              onClick={() => handleClick('error', item)}
            >
              <span className="card-rank">TOP {index + 1}</span>
              <span className="card-title">{item.name}</span>
              <div className="card-stats">
                <span className="card-count">{item.count}</span>
                <span className="card-percent">条 / 占比 {item.percent}%</span>
              </div>
              <div className="card-meta">
                <span>涉及：{formatList(item.grades)}</span>
                <span>高发周次：{formatList(item.weeks)}</span>
              </div>
              <div className="card-example">代表案例：{getExampleText(item)}</div>
            </div>
          );
        }}
      />

      {/* Unclear Requirement & Rework — Lightweight Carousel */}
      {(unclearTop3.length > 0 || reworkTop.length > 0) && (
        <CarouselSection
          title="🟡 需求不明确与反复调整"
          subtitle="最容易造成沟通成本和返工风险的工单类型"
          items={[...unclearTop3.map((item) => ({ ...item, cardType: 'unclear' })), ...reworkTop.map((item) => ({ ...item, cardType: 'rework' }))]}
          autoPlay={[...unclearTop3, ...reworkTop].length > 3}
          interval={5000}
          visibleCount={1}
          cardGap={16}
          pauseOnHover={true}
          loop={true}
          renderItem={(item) => {
            if (item.cardType === 'unclear') {
              const isActive = activeSection === 'unclear' && activeItemKey === (item.reason || item.name);
              return (
                <div
                  className={`carousel-error-card ${isActive ? 'active-card' : ''}`}
                  onClick={() => handleUnclearReasonClick(item)}
                  style={{ minHeight: 140 }}
                >
                  <span className="card-rank" style={{ fontSize: 16 }}>不明确</span>
                  <span className="card-title">{item.reason || item.name}</span>
                  <div className="card-stats">
                    <span className="card-count">{item.count}</span>
                    <span className="card-percent">条 / 占比 {item.percent}%</span>
                  </div>
                  <div className="card-meta">
                    <span>关键词：{item.examples?.flatMap((e) => e.issueKeywords || []).slice(0, 5).join('、') || '暂无'}</span>
                  </div>
                </div>
              );
            }
            const isActive = activeSection === 'rework' && activeItemKey === item.name;
            return (
              <div
                className={`carousel-error-card ${isActive ? 'active-card' : ''}`}
                onClick={() => handleClick('rework', item)}
                style={{ minHeight: 140, borderColor: 'rgba(217,45,32,0.2)' }}
              >
                <span className="card-rank" style={{ fontSize: 16, background: 'linear-gradient(135deg, #d92d20, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>反复调整</span>
                <span className="card-title">{item.name}</span>
                <div className="card-stats">
                  <span className="card-count" style={{ color: '#d92d20' }}>{item.count}</span>
                  <span className="card-percent">条 / 占比 {item.percent}%</span>
                </div>
                <div className="card-example">代表案例：{getExampleText(item)}</div>
              </div>
            );
          }}
        />
      )}

      {/* Fallback if no data */}
      {errorTop5.length === 0 && unclearTop3.length === 0 && reworkTop.length === 0 && (
        <section className="conclusion-section">
          <div className="section-title">🔴 高频出错内容 Top5</div>
          <div className="empty-state small-empty" style={{ padding: 16, fontSize: 13 }}>暂无高频出错内容</div>
        </section>
      )}

      {/* Rework Root Causes Summary */}
      {reworkCauses.length > 0 && (
        <section className="conclusion-section">
          <div className="section-title">🟠 反复修改根因分布</div>
          {reworkCauses.map((cause) => (
            <div
              key={cause.label}
              className="conclusion-item"
              onClick={() => onFilterChange?.({ type: 'rework', value: cause.label, label: cause.label })}
            >
              <div className="item-info">
                <div className="item-name">{cause.label}</div>
              </div>
              <span className="item-count">{cause.count} 条</span>
              <span className="item-arrow">→</span>
            </div>
          ))}
        </section>
      )}

      {/* Improvement Suggestions */}
      <section className="conclusion-section">
        <div className="section-title">💡 改进建议</div>
        {suggestions.length > 0 ? (
          <ul className="suggestions-list">
            {suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        ) : (
          <div className="empty-state small-empty" style={{ padding: 16, fontSize: 13 }}>暂无明显风险建议</div>
        )}
      </section>
    </div>
  );
}
