import { useEffect } from "react";
import { useSettings } from "../context/SettingsContext.jsx";

const AUTO_ADVANCE_MS = 1600;

// Spans both the brief "waiting on Firebase's initial auth check" window and
// (for an authenticated, first-ever-this-session visit) the branded splash
// that follows it — App.jsx keeps this as a single mounted instance across
// that transition rather than swapping in a second, separate component, so
// the logo never unmounts/remounts (and its fade-in never restarts) partway
// through. `active` just turns on the auto-advance timer and click-to-skip
// once we're actually past the auth check; the logo itself is always shown.
export default function SplashScreen({ active, onDone }) {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(onDone, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [active, onDone]);

  return (
    <div className="splash-screen" onClick={active ? onDone : undefined}>
      <img src={logoSrc} alt="My Kitab" className="splash-logo" />
      <div className="splash-app-name">My Kitab</div>
    </div>
  );
}
