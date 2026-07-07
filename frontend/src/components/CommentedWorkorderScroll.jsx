import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

export default function CommentedWorkorderScroll({
  workorders = [],
  onCommentClick,
  onCardClick,
  autoPlay = true,
  maxItems = 30
}) {
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef(null);
  const timerRef = useRef(null);

  const items = workorders.slice(0, maxItems);
  const hasEnoughItems = items.length > 5;
  const displayItems = hasEnoughItems ? [...items, ...items, ...items] : items;

  const scrollTo = useCallback((position) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop = position;
  }, []);

  useEffect(() => {
    if (!autoPlay || !hasEnoughItems || isPaused) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (!scrollContainerRef.current) return;
      const container = scrollContainerRef.current;
      const rowHeight = 52;
      const scrollTarget = container.scrollTop + rowHeight;
      const maxScroll = container.scrollHeight - container.clientHeight;
      const singleSetHeight = maxScroll / 3;

      if (scrollTarget >= singleSetHeight * 2) {
        container.scrollTop = scrollTarget - singleSetHeight;
      } else {
        container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
      }
    }, 3000);

    return () => clearInterval(timerRef.current);
  }, [autoPlay, hasEnoughItems, isPaused]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="panel auto-scroll-panel" style={{ padding: '16px 20px' }}>
      <div className="section-heading" style={{ marginBottom: 10 }}>
        <div>
          <p className="eyebrow">Commented Workorders</p>
          <h2 style={{ fontSize: 'var(--fs-h2)', margin: 0 }}>💬 有评论的工单</h2>
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

      <div className="auto-scroll-mask">
        <div
          className="auto-scroll-container"
          ref={scrollContainerRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{ maxHeight: 320, overflowY: 'auto' }}
        >
          {displayItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="cw-scroll-card"
            >
              {/* 主体：点击打开评论抽屉 */}
              <div
                className="cw-scroll-main"
                onClick={() => onCommentClick?.(item)}
                title="点击查看评论详情"
              >
                <div className="cw-tags">
                  <span className={`risk-tag risk-${item.riskLevel}`} style={{ fontSize: 'var(--fs-micro)', padding: '1px 6px' }}>
                    {item.riskLevel || '-'}
                  </span>
                  <span style={{ fontSize: 'var(--fs-overline)', color: 'var(--text-muted)' }}>
                    {item.grade || '-'} · {item.status || '-'}
                  </span>
                </div>
                <div className="cw-desc">
                  {item.description?.substring(0, 45) || '未填写'}
                  {item.description?.length > 45 ? '...' : ''}
                </div>
                <div className="cw-comment-preview">
                  <Icon icon="mdi:comment-text-outline" width={12} height={12} style={{ flexShrink: 0 }} />
                  <span className="cw-preview-text">
                    {item.latest_comment_content || '(无内容)'}
                  </span>
                </div>
              </div>

              {/* 右侧：评论数 + 点击看详情 */}
              <div className="cw-scroll-side">
                <div className="cw-comment-badge" onClick={() => onCommentClick?.(item)} title="查看评论">
                  <Icon icon="mdi:comment-outline" width={14} height={14} />
                  <span>{item.comment_count || 0}</span>
                </div>
                <button
                  className="cw-detail-btn"
                  onClick={() => onCardClick?.(item)}
                  title="查看工单详情"
                >
                  详情
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
