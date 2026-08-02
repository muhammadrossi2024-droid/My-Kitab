import { createContext, useContext, useEffect, useRef, useState } from "react";

const SCROLL_DELTA_THRESHOLD = 10; // ignore tiny/jittery scroll movements
const REVEAL_NEAR_TOP = 80; // always show the bar near the very top of a page

const NavVisibilityContext = createContext(null);

// Drives the bottom nav's auto-hide-on-scroll behavior: hidden while
// scrolling down, revealed on any scroll up. `lock()` forces it visible
// (used by the guided tour, which needs the real nav on screen to spotlight).
export function NavVisibilityProvider({ children }) {
  const [hidden, setHidden] = useState(false);
  const [locked, setLocked] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) return;
      if (y <= REVEAL_NEAR_TOP) {
        setHidden(false);
      } else if (delta > 0) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const value = {
    hidden: locked ? false : hidden,
    show: () => setHidden(false),
    toggle: () => setHidden((h) => !h),
    lock: () => setLocked(true),
    unlock: () => setLocked(false),
  };

  return <NavVisibilityContext.Provider value={value}>{children}</NavVisibilityContext.Provider>;
}

export function useNavVisibility() {
  const ctx = useContext(NavVisibilityContext);
  if (!ctx) throw new Error("useNavVisibility must be used within NavVisibilityProvider");
  return ctx;
}
