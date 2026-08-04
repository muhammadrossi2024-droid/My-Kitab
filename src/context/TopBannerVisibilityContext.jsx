import { createContext, useContext, useState } from "react";

const TopBannerVisibilityContext = createContext(null);

// Scoped strictly to the note-taking flip cards (Quran/Mutoon) — entirely
// separate from NavVisibilityContext, which drives the *bottom* nav's own
// auto-hide-on-scroll and must not be touched by this. A focused note
// textarea can get auto-scrolled into view by the browser without any
// awareness that the fixed TopBanner covers the top of the viewport;
// hiding the banner while a note card is flipped open removes that
// overlap instead of trying to out-guess the browser's scroll-into-view.
//
// Counter-based (not a plain boolean) so two flip cards open at once don't
// fight over ownership: hide() increments, show() decrements, and the
// banner only reappears once nothing is still requesting it hidden.
export function TopBannerVisibilityProvider({ children }) {
  const [hideCount, setHideCount] = useState(0);

  const value = {
    hidden: hideCount > 0,
    hide: () => setHideCount((c) => c + 1),
    show: () => setHideCount((c) => Math.max(0, c - 1)),
  };

  return (
    <TopBannerVisibilityContext.Provider value={value}>
      {children}
    </TopBannerVisibilityContext.Provider>
  );
}

export function useTopBannerVisibility() {
  const ctx = useContext(TopBannerVisibilityContext);
  if (!ctx) throw new Error("useTopBannerVisibility must be used within TopBannerVisibilityProvider");
  return ctx;
}
