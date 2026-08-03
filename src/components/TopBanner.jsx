import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Settings } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";

// Persistent app identity banner, shown above every page. The banner itself
// is a fixed dark-green fill (same shade as --accent in light mode, e.g.
// the "Resume Reading" button) in both themes — see .top-banner in
// index.css. Because that fill is always dark, the logo needs to be light
// against it: dark mode keeps its usual light-on-dark logo-dark.png, but
// light mode swaps in a dedicated white banner-only logo (logo-banner-
// white.png) instead of the normal dark-ink logo-light.png used
// everywhere else (splash, auth, settings) — that one would be nearly
// invisible on this green fill.
//
// Search and Settings live here (not in the bottom nav) — small, unobtrusive
// icon buttons pinned to the right edge, always reachable from any page.
export default function TopBanner() {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-banner-white.png";
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
    <header className="top-banner">
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
