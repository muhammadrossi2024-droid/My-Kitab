import { Link } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";

// Persistent app identity banner, shown above every page. Reuses the same
// theme-aware logo files as the splash screen (dark-green ink on light,
// mint-green on dark) — deliberately kept on the app's own bg-elevated
// surface rather than a solid accent-colored fill: --accent IS that same
// dark-green/mint-green in each theme, so an accent-filled banner would
// wash the logo out to near-invisible in both themes.
//
// Search and Settings live here (not in the bottom nav) — small, unobtrusive
// icon buttons pinned to the right edge, always reachable from any page.
export default function TopBanner() {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  return (
    <header className="top-banner">
      <img src={logoSrc} alt="" className="top-banner-logo" />
      <div className="top-banner-text">
        <div className="top-banner-name">My Kitab</div>
        <div className="top-banner-tagline">Your personal Islamic library</div>
      </div>
      <div className="top-banner-actions">
        <Link to="/search" className="top-banner-action-link" aria-label="Search" title="Search">
          <Search className="top-banner-action-icon" strokeWidth={2} />
        </Link>
        <Link
          to="/settings"
          className="top-banner-action-link"
          aria-label="Settings"
          title="Settings"
        >
          <SlidersHorizontal className="top-banner-action-icon" strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}
