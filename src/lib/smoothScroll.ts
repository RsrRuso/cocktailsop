/**
 * Smooth Scroll Utilities
 * Virtual scrolling and optimized scroll performance
 */

// Optimized scroll to element
export const smoothScrollTo = (
  element: HTMLElement | null,
  options: { offset?: number; duration?: number; container?: HTMLElement } = {}
) => {
  if (!element) return;
  
  const { offset = 0, duration = 300, container } = options;
  const scrollContainer = container || window;
  
  const targetPosition = element.getBoundingClientRect().top + 
    (container ? container.scrollTop : window.scrollY) - offset;
  
  const startPosition = container ? container.scrollTop : window.scrollY;
  const distance = targetPosition - startPosition;
  let startTime: number | null = null;
  
  const animation = (currentTime: number) => {
    if (startTime === null) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const position = startPosition + distance * ease;
    
    if (container) {
      container.scrollTop = position;
    } else {
      window.scrollTo(0, position);
    }
    
    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  };
  
  requestAnimationFrame(animation);
};

// Scroll snap helper for reels/stories
export const createScrollSnap = (
  container: HTMLElement,
  options: { 
    itemHeight?: number; 
    onChange?: (index: number) => void;
    threshold?: number;
  } = {}
) => {
  const { itemHeight, onChange, threshold = 0.5 } = options;
  let currentIndex = 0;
  let isScrolling = false;
  let scrollTimeout: NodeJS.Timeout;
  
  const getItemHeight = () => itemHeight || container.clientHeight;
  
  const snapToIndex = (index: number) => {
    if (index === currentIndex) return;
    
    currentIndex = index;
    const targetPosition = index * getItemHeight();
    
    container.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
    
    onChange?.(index);
  };
  
  const handleScroll = () => {
    if (isScrolling) return;
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollTop = container.scrollTop;
      const height = getItemHeight();
      const nearestIndex = Math.round(scrollTop / height);
      
      if (nearestIndex !== currentIndex) {
        currentIndex = nearestIndex;
        onChange?.(currentIndex);
      }
    }, 50);
  };
  
  container.addEventListener('scroll', handleScroll, { passive: true });
  
  return {
    goToIndex: (index: number) => {
      isScrolling = true;
      snapToIndex(index);
      setTimeout(() => { isScrolling = false; }, 400);
    },
    getCurrentIndex: () => currentIndex,
    destroy: () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    }
  };
};

// Momentum scroll for mobile feel
export const createMomentumScroll = (container: HTMLElement) => {
  let velocity = 0;
  let lastY = 0;
  let lastTime = 0;
  let animationId: number;
  
  const handleTouchMove = (e: TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const currentTime = performance.now();
    const deltaY = currentY - lastY;
    const deltaTime = currentTime - lastTime;
    
    if (deltaTime > 0) {
      velocity = deltaY / deltaTime;
    }
    
    lastY = currentY;
    lastTime = currentTime;
  };
  
  const handleTouchEnd = () => {
    const friction = 0.95;
    
    const animate = () => {
      if (Math.abs(velocity) < 0.01) return;
      
      container.scrollTop -= velocity * 16;
      velocity *= friction;
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
  };
  
  const handleTouchStart = (e: TouchEvent) => {
    cancelAnimationFrame(animationId);
    lastY = e.touches[0].clientY;
    lastTime = performance.now();
    velocity = 0;
  };
  
  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchmove', handleTouchMove, { passive: true });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
  
  return () => {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
    cancelAnimationFrame(animationId);
  };
};

// Infinite scroll helper
export const createInfiniteScroll = (
  container: HTMLElement,
  options: {
    threshold?: number;
    onLoadMore: () => Promise<void>;
    hasMore: () => boolean;
  }
) => {
  const { threshold = 200, onLoadMore, hasMore } = options;
  let loading = false;
  
  const checkScroll = () => {
    if (loading || !hasMore()) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    if (distanceFromBottom < threshold) {
      loading = true;
      onLoadMore().finally(() => {
        loading = false;
      });
    }
  };
  
  container.addEventListener('scroll', checkScroll, { passive: true });
  
  return () => {
    container.removeEventListener('scroll', checkScroll);
  };
};

// Hide/show header on scroll
export const createScrollHideHeader = (
  header: HTMLElement,
  options: { threshold?: number; hideClass?: string } = {}
) => {
  const { threshold = 50, hideClass = 'translate-y-[-100%]' } = options;
  let lastScrollY = 0;
  let ticking = false;
  
  const update = () => {
    const scrollY = window.scrollY;
    
    if (scrollY > lastScrollY && scrollY > threshold) {
      header.classList.add(hideClass);
    } else {
      header.classList.remove(hideClass);
    }
    
    lastScrollY = scrollY;
    ticking = false;
  };
  
  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
};
