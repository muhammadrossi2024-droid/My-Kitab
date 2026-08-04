import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Settings } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import { useTopBannerVisibility } from "../context/TopBannerVisibilityContext.jsx";

// Persistent app identity banner, shown above every page. Solid black in
// dark mode / solid white in light mode, with the theme-matching transparent
// book mark logo laid directly on top.
//
// Search and Settings live here (not in the bottom nav) — small, unobtrusive
// icon buttons pinned to the right edge, always reachable from any page.
//
// Temporarily hidden while a Quran/Mutoon note flip-card is open (see
// TopBannerVisibilityContext) — a focused note textarea can get
// auto-scrolled into view by the browser without knowing this fixed
// banner covers the top of the viewport, so hiding it removes the overlap
// instead of fighting the browser's own scroll behavior. This is a
// separate context from the bottom nav's own auto-hide, left untouched.
export default function TopBanner() {
  const { settings } = useSettings();
  const { hidden } = useTopBannerVisibility();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";
  const location = useLocation();
  const navigate = useNavigate();

  // Tapping the icon for the page you're already on toggles back to
  // wherever you came from, instead of a no-op re-navigation to the same
  // route. navigate(-1) is synchronous (no async work in between), so a
  // rapid second tap can't double-trigger or lag.
  function toggle(path, e) {
    if (location.pathname === path) {
      e.preventDefault();
      navigate(-1);
    }
  }

  return (
    <header className={"top-banner" + (hidden ? " top-banner-hidden" : "")}>
      <img src={logoSrc} alt="" className="top-banner-logo" />
      <div className="top-banner-text">
        <div className="top-banner-name">My Kitab</div>
        <div className="top-banner-tagline">Your personal Islamic library</div>
      </div>
      <div className="top-banner-actions">
        <Link
          to="/search"
          data-tour-id="/search"
          className="top-banner-action-link"
          aria-label="Search"
          title="Search"
          onClick={(e) => toggle("/search", e)}
        >
          <Search className="top-banner-action-icon" strokeWidth={2} />
        </Link>
        <Link
          to="/settings"
          data-tour-id="/settings"
          className="top-banner-action-link"
          aria-label="Settings"
          title="Settings"
          onClick={(e) => toggle("/settings", e)}
        >
          <Settings className="top-banner-action-icon" strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}
