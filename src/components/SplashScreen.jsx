import { useEffect } from "react";
import { useSettings } from "../context/SettingsContext.jsx";

const AUTO_ADVANCE_MS = 1600;

export default function SplashScreen({ onDone }) {
  const { settings } = useSettings();
  const logoSrc = settings.theme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  useEffect(() => {
    const timer = setTimeout(onDone, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="splash-screen" onClick={onDone}>
      <img src={logoSrc} alt="My Kitab" className="splash-logo" />
      <div className="splash-app-name">My Kitab</div>
    </div>
  );
}
