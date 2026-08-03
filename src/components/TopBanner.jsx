import { useSettings } from "../context/SettingsContext.jsx";

// Persistent app identity banner, shown above every page. Reuses the same
// theme-aware logo files as the splash screen (dark-green ink on light,
// mint-green on dark) — deliberately kept on the app's own bg-elevated
// surface rather than a solid accent-colored fill: --accent IS that same
// dark-green/mint-green in each theme, so an accent-filled banner would
// wash the logo out to near-invisible in both themes.
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
    </header>
  );
}
