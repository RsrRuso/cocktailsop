import { useState, useEffect, useRef, useCallback, useMemo, memo, ReactNode } from 'react';

interface VirtualFeedProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  overscan?: number;
  className?: string;
  emptyMessage?: ReactNode;
  loadingPlaceholder?: ReactNode;
  isLoading?: boolean;
}

/**
 * Instagram-style virtual scrolling feed
 * Only renders visible items + overscan buffer for smooth scrolling
 */
export function VirtualFeed<T extends { id: string }>({
  items,
  renderItem,
  itemHeight = 600, // Estimated height per item
  overscan = 3, // Extra items to render above/below viewport
  className = '',
  emptyMessage,
  loadingPlaceholder,
  isLoading = false,
}: VirtualFeedProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  // Calculate visible range
  const { startIndex, endIndex, paddingTop, paddingBottom } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    
    return {
      startIndex: start,
      endIndex: end,
      paddingTop: start * itemHeight,
      paddingBottom: Math.max(0, (items.length - end) * itemHeight),
    };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => 
    items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  // Throttled scroll handler
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      // Use scrollY for window scroll
      setScrollTop(window.scrollY);
    }
  }, []);

  // Set up scroll listener with passive option
  useEffect(() => {
    // Throttle scroll updates using RAF
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Also listen to resize
    const handleResize = () => {
      setContainerHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleScroll]);

  // Show loading state
  if (isLoading && items.length === 0) {
    return <>{loadingPlaceholder}</>;
  }

  // Show empty state
  if (!isLoading && items.length === 0) {
    return <>{emptyMessage}</>;
  }

  return (
    <div 
      ref={containerRef}
      className={`virtual-feed ${className}`}
      style={{
        position: 'relative',
      }}
    >
      {/* Top spacer */}
      <div style={{ height: paddingTop }} aria-hidden="true" />
      
      {/* Visible items */}
      {visibleItems.map((item, index) => (
        <div
          key={item.id}
          className="feed-item"
          style={{
            contentVisibility: 'auto',
            containIntrinsicSize: `0 ${itemHeight}px`,
          }}
        >
          {renderItem(item, startIndex + index)}
        </div>
      ))}
      
      {/* Bottom spacer */}
      <div style={{ height: paddingBottom }} aria-hidden="true" />
    </div>
  );
}

// Memoized wrapper for better performance
export const MemoizedVirtualFeed = memo(VirtualFeed) as typeof VirtualFeed;
