import { useCallback, useEffect, useRef, useState } from 'react';

function formatArray(values) {
  return values?.length ? values.join('、') : '-';
}

export default function AutoScrollWorkorders({
  workorders = [],
  onCardClick,
  autoPlay = true,
  scrollSpeed = 3500,    // ms per row scroll
  maxItems = 20
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const scrollContainerRef = useRef(null);
  const timerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const scrollPosRef = useRef(0);

  const items = workorders.slice(0, maxItems);
  const hasEnoughItems = items.length > 4;

  // For continuous scroll, duplicate items for seamless loop
  const displayItems = hasEnoughItems ? [...items, ...items, ...items] : items;

  const scrollTo = useCallback((position) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop = position;
    scrollPosRef.current = position;
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (!autoPlay || !hasEnoughItems || isPaused) {
      clearInterval(timerRef.current);
      return;
    }

    // Estimate row height
    timerRef.current = setInterval(() => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const rowHeight = 200; // Approximate card height + gap
      const scrollTarget = container.scrollTop + rowHeight;
      const totalHeight = container.scrollHeight;
      const visibleHeight = container.clientHeight;
      const maxScroll = totalHeight - visibleHeight;

      // Seamless loop: when we reach the end of the first copy set
      const singleSetHeight = maxScroll / 3; // Since we duplicated 3x
      if (scrollTarget >= singleSetHeight * 2) {
        // Jump back to the same visual position in the first set
        container.scrollTop = scrollTarget - singleSetHeight;
      } else {
        container.scrollTo({
          top: scrollTarget,
          behavior: 'smooth'
        });
      }
    }, scrollSpeed);

    return () => clearInterval(timerRef.current);
  }, [autoPlay, hasEnoughItems, isPaused, scrollSpeed]);

  // Resume after user scroll
  useEffect(() => {
    if (!userScrolled) return;
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setUserScrolled(false);
    }, 5000);
    return () => clearTimeout(resumeTimerRef.current);
  }, [userScrolled]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(resumeTimerRef.current);
    };
  }, []);

  function handleUserScroll() {
    setUserScrolled(true);
  }

  return (
    <section className="panel auto-scroll-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Focus Workorders</p>
          <h2>重点工单列表</h2>
          <p className="muted">优先展示疑似反复调整、需求不明确、高风险和未完成工单；同一条工单只出现一次。</p>
        </div>
        <div className="carousel-controls">
          <span className="count-badge" style={{ marginRight: 8 }}>{items.length} 条</span>
          {hasEnoughItems && autoPlay && (
            <button
              className="carousel-autoplay-toggle"
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? '恢复自动滚动' : '暂停自动滚动'}
            >
              {isPaused ? '▶ 播放' : '⏸ 暂停'}
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state small-empty">暂无重点工单</div>
      ) : (
        <div className="auto-scroll-mask">
          <div
            className="auto-scroll-container"
            ref={scrollContainerRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onScroll={handleUserScroll}
            style={{ maxHeight: 'calc(100vh - 380px)', minHeight: '420px', overflowY: hasEnoughItems ? 'auto' : 'auto' }}
          >
            <div className="focus-list">
              {displayItems.map((item, idx) => (
                <article
                  key={`${item.id}-${idx}`}
                  className="focus-card auto-scroll-card"
                  onClick={() => onCardClick?.(item)}
                  title="点击查看详情"
                >
                  <div className="focus-card-top">
                    <div className="focus-tags">
                      <span className={`risk-tag risk-${item.riskLevel}`}>{item.riskLevel || '-'}</span>
                      {item.isUnclearRequirement && <span className="tag warning">需求不明确</span>}
                      {item.isRepeatedAdjustmentCandidate && <span className="tag danger">疑似反复调整</span>}
                      {item.isUrgent && <span className="tag danger">紧急</span>}
                    </div>
                    <span className="case-meta">{item.updatedAt || '未填写更新时间'}</span>
                  </div>

                  <p className="focus-description">{item.description || '未填写问题描述'}</p>

                  <div className="focus-grid">
                    <div><span>课程定位</span><strong>{item.coursePosition || '-'}</strong></div>
                    <div><span>所属类型</span><strong>{item.type || '-'}</strong></div>
                    <div><span>问题分类</span><strong>{item.issueCategory || '-'}</strong></div>
                    <div><span>关键词</span><strong>{formatArray(item.issueKeywords)}</strong></div>
                    <div><span>不明确原因</span><strong>{formatArray(item.unclearReasons)}</strong></div>
                    <div><span>状态 / 负责人</span><strong>{item.status || '-'} / {item.owner || '-'}</strong></div>
                  </div>

                  <div className="focus-reasons">
                    <p><b>风险原因：</b>{formatArray(item.riskReasons)}</p>
                    <p><b>处理建议：</b>{formatArray(item.suggestions)}</p>
                  </div>

                  <div className="card-click-hint">
                    点击查看详情 →
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
