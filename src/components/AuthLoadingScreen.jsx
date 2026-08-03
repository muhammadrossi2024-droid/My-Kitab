import { useSettings } from "../context/SettingsContext.jsx";

// Shown only for the brief window before Firebase reports its first
// (locally-resolved, near-instant) auth-state callback — reuses the splash
// screen's own CSS so no new styling is needed for what's essentially the
// same "branded loading" moment, just with no timer and nothing to click.
export default function AuthLoadingScreen() {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  return (
    <div className="splash-screen">
      <img src={logoSrc} alt="My Kitab" className="splash-logo" />
    </div>
  );
}
