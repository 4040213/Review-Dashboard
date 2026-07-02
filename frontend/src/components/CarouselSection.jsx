import { useCallback, useEffect, useRef, useState } from 'react';

export default function CarouselSection({
  title,
  subtitle,
  titleClass = '',
  items = [],
  renderItem,
  autoPlay = true,
  interval = 3500,
  visibleCount = 1,
  cardGap = 16,
  pauseOnHover = true,
  loop = true,
  emptyMessage = '暂无数据'
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / visibleCount));
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const timerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const containerRef = useRef(null);

  const hasEnoughItems = items.length > visibleCount;

  const goTo = useCallback((page) => {
    if (!loop && (page < 0 || page >= totalPages)) return;
    const wrapped = ((page % totalPages) + totalPages) % totalPages;
    setCurrentPage(wrapped);
  }, [totalPages, loop]);

  const goNext = useCallback(() => goTo(currentPage + 1), [goTo, currentPage]);
  const goPrev = useCallback(() => goTo(currentPage - 1), [goTo, currentPage]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || !hasEnoughItems || isPaused) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(goNext, interval);
    return () => clearInterval(timerRef.current);
  }, [autoPlay, hasEnoughItems, isPaused, goNext, interval]);

  // Resume after user interaction
  useEffect(() => {
    if (!userInteracted) return;
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setUserInteracted(false);
    }, 5000);
    return () => clearTimeout(resumeTimerRef.current);
  }, [userInteracted, currentPage]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); setUserInteracted(true); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setUserInteracted(true); goNext(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setUserInteracted(true);
      diff > 0 ? goNext() : goPrev();
    }
    setTouchStart(null);
  };

  const visibleItems = [];
  for (let i = 0; i < visibleCount; i++) {
    const index = (currentPage * visibleCount + i) % items.length;
    if (index < items.length || !loop) {
      visibleItems.push(items[index] || null);
    }
  }

  return (
    <section
      className="conclusion-section carousel-section"
      ref={containerRef}
      onMouseEnter={pauseOnHover ? () => setIsPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsPaused(false) : undefined}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="carousel-header">
        <div>
          <div className={`section-title ${titleClass}`}>{title}</div>
          {subtitle && <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
        <div className="carousel-controls">
          {hasEnoughItems && autoPlay && (
            <button
              className="carousel-autoplay-toggle"
              onClick={() => { setUserInteracted(true); setIsPaused(!isPaused); }}
              title={isPaused ? '恢复自动播放' : '暂停自动播放'}
            >
              {isPaused ? '▶ 播放' : '⏸ 暂停'}
            </button>
          )}
          {hasEnoughItems && (
            <div className="carousel-arrows">
              <button className="carousel-arrow" onClick={() => { setUserInteracted(true); goPrev(); }} aria-label="上一张">
                ‹
              </button>
              <button className="carousel-arrow" onClick={() => { setUserInteracted(true); goNext(); }} aria-label="下一张">
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state small-empty" style={{ padding: 16, fontSize: 13 }}>{emptyMessage}</div>
      ) : (
        <div className="carousel-track-wrapper">
          <div
            className="carousel-track"
            style={{
              transform: `translateX(calc(-${currentPage * 100}% - ${currentPage * cardGap}px))`,
              gap: cardGap
            }}
          >
            {items.map((item, index) => (
              <div
                key={item?.id || index}
                className={`carousel-card-wrapper ${index >= currentPage * visibleCount && index < (currentPage + 1) * visibleCount ? 'carousel-card-visible' : ''}`}
                style={{ flex: `0 0 calc(${100 / visibleCount}% - ${cardGap * (visibleCount - 1) / visibleCount}px)` }}
              >
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasEnoughItems && (
        <div className="carousel-dots">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === currentPage ? 'active' : ''}`}
              onClick={() => { setUserInteracted(true); goTo(i); }}
              aria-label={`第 ${i + 1} 页`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
