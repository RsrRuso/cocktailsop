import { useEffect, useState } from "react";

/**
 * Returns the current on-screen keyboard inset (px) for mobile browsers that support VisualViewport.
 * This helps keep bottom input bars visible when the keyboard opens (especially iOS Safari).
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        setInset(Math.round(next));
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return inset;
}
