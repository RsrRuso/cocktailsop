/**
 * GPU-Accelerated Animation System
 * Uses transform3d and will-change for 60fps animations
 */

// Force GPU acceleration on element
export const enableGPU = (element: HTMLElement) => {
  element.style.transform = 'translateZ(0)';
  element.style.willChange = 'transform, opacity';
  element.style.backfaceVisibility = 'hidden';
  element.style.perspective = '1000px';
};

// Disable GPU acceleration when done
export const disableGPU = (element: HTMLElement) => {
  element.style.willChange = 'auto';
};

// High-performance scroll handler using passive listeners
export const addPassiveScroll = (
  element: HTMLElement | Window,
  callback: (e: Event) => void
) => {
  element.addEventListener('scroll', callback, { passive: true });
  return () => element.removeEventListener('scroll', callback);
};

// RAF-based scroll position tracker for smooth updates
let ticking = false;
let lastScrollY = 0;

export const createScrollTracker = (callback: (scrollY: number) => void) => {
  const update = () => {
    callback(lastScrollY);
    ticking = false;
  };

  const requestTick = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  const handleScroll = () => {
    lastScrollY = window.scrollY;
    requestTick();
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
};

// Smooth spring animation
export const springAnimation = (
  element: HTMLElement,
  property: 'translateX' | 'translateY' | 'scale' | 'opacity',
  targetValue: number,
  options: { stiffness?: number; damping?: number; mass?: number } = {}
) => {
  const { stiffness = 100, damping = 10, mass = 1 } = options;
  
  let velocity = 0;
  let position = parseFloat(element.dataset[property] || '0');
  let animationId: number;
  
  const animate = () => {
    const force = (targetValue - position) * stiffness;
    const dampingForce = velocity * damping;
    const acceleration = (force - dampingForce) / mass;
    
    velocity += acceleration * 0.016; // 60fps timestep
    position += velocity * 0.016;
    
    element.dataset[property] = position.toString();
    
    switch (property) {
      case 'translateX':
        element.style.transform = `translate3d(${position}px, 0, 0)`;
        break;
      case 'translateY':
        element.style.transform = `translate3d(0, ${position}px, 0)`;
        break;
      case 'scale':
        element.style.transform = `scale3d(${position}, ${position}, 1)`;
        break;
      case 'opacity':
        element.style.opacity = position.toString();
        break;
    }
    
    if (Math.abs(velocity) > 0.01 || Math.abs(targetValue - position) > 0.01) {
      animationId = requestAnimationFrame(animate);
    }
  };
  
  animationId = requestAnimationFrame(animate);
  
  return () => cancelAnimationFrame(animationId);
};

// Instant fade transition (no delay)
export const instantFade = (element: HTMLElement, show: boolean) => {
  element.style.transition = 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)';
  element.style.opacity = show ? '1' : '0';
};

// GPU-accelerated page transition
export const pageTransition = (
  outElement: HTMLElement | null,
  inElement: HTMLElement | null
) => {
  if (outElement) {
    outElement.style.transition = 'opacity 100ms ease-out, transform 100ms ease-out';
    outElement.style.transform = 'translate3d(-10px, 0, 0)';
    outElement.style.opacity = '0';
  }
  
  if (inElement) {
    inElement.style.transform = 'translate3d(10px, 0, 0)';
    inElement.style.opacity = '0';
    
    requestAnimationFrame(() => {
      inElement.style.transition = 'opacity 150ms ease-out, transform 150ms ease-out';
      inElement.style.transform = 'translate3d(0, 0, 0)';
      inElement.style.opacity = '1';
    });
  }
};

// Optimize list rendering with content-visibility
export const optimizeListItem = (element: HTMLElement, height: number) => {
  element.style.contentVisibility = 'auto';
  element.style.containIntrinsicSize = `auto ${height}px`;
  element.style.contain = 'layout style paint';
};

// Batch DOM updates for better performance
const pendingUpdates: (() => void)[] = [];
let updateScheduled = false;

export const batchDOMUpdate = (update: () => void) => {
  pendingUpdates.push(update);
  
  if (!updateScheduled) {
    updateScheduled = true;
    requestAnimationFrame(() => {
      const updates = [...pendingUpdates];
      pendingUpdates.length = 0;
      updateScheduled = false;
      updates.forEach(fn => fn());
    });
  }
};

// Preload animation frames
export const preloadAnimations = () => {
  // Trigger browser to cache animation computations
  const style = document.createElement('style');
  style.textContent = `
    .gpu-accelerate {
      transform: translateZ(0);
      will-change: transform, opacity;
      backface-visibility: hidden;
    }
    .instant-transition {
      transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 150ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    .no-transition {
      transition: none !important;
    }
  `;
  document.head.appendChild(style);
};

// Initialize on load
if (typeof window !== 'undefined') {
  preloadAnimations();
}
