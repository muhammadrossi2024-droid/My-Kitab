import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Settings } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";

// Persistent app identity banner, shown above every page. Solid black in
// dark mode / solid white in light mode, with the theme-matching transparent
// book mark logo laid directly on top.
//
// Search and Settings live here (not in the bottom nav) — small, unobtrusive
// icon buttons pinned to the right edge, always reachable from any page.
export default function TopBanner() {
  const { settings } = useSettings();
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
