import { useState } from "react";
import { Share, MoreVertical, SquarePlus, Check } from "lucide-react";

// Flip this (and fill in the two store URLs) once the native app actually
// ships — everything else in this section, including the "hide once
// already installed" check below, stays exactly as-is.
const NATIVE_APP_READY = false;
const APP_STORE_URL = "#";
const PLAY_STORE_URL = "#";

const PLATFORM_STEPS = {
  iphone: [
    { icon: Share, text: "Tap the Share icon in Safari's toolbar." },
    { icon: SquarePlus, text: 'Tap "Add to Home Screen".' },
    { icon: Check, text: 'Tap "Add" to confirm.' },
  ],
  android: [
    { icon: MoreVertical, text: "Tap the menu icon (⋮) in your browser." },
    { icon: SquarePlus, text: 'Tap "Add to Home screen" or "Install app".' },
    { icon: Check, text: 'Tap "Add" or "Install" to confirm.' },
  ],
};

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.navigator.standalone === true
  );
}

function detectPlatform() {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return null;
}

export default function InstallGuide() {
  const [standalone] = useState(isStandalone);
  const [platform, setPlatform] = useState(detectPlatform);

  // Already added to the home screen / installed — nothing left to offer.
  if (standalone) return null;

  return (
    <div className="card">
      <div className="form-row-label">Install the App</div>
      <p className="form-row-desc" style={{ marginBottom: 16 }}>
        Our app isn't quite ready yet — but it's coming soon! In the meantime, here's a quick way
        to get the same experience right now.
      </p>

      {NATIVE_APP_READY ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn btn-primary" href={APP_STORE_URL}>
            App Store
          </a>
          <a className="btn btn-primary" href={PLAY_STORE_URL}>
            Google Play
          </a>
        </div>
      ) : (
        <>
          <div className="install-question">
            <span>Are you using an iPhone or Samsung/Android?</span>
            <div className="theme-toggle-group">
              <button
                type="button"
                className={"theme-toggle-btn" + (platform === "iphone" ? " active" : "")}
                onClick={() => setPlatform("iphone")}
              >
                iPhone
              </button>
              <button
                type="button"
                className={"theme-toggle-btn" + (platform === "android" ? " active" : "")}
                onClick={() => setPlatform("android")}
              >
                Samsung/Android
              </button>
            </div>
          </div>

          {platform && (
            <>
              <ol className="install-steps">
                {PLATFORM_STEPS[platform].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="install-step">
                    <span className="install-step-icon">
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    {text}
                  </li>
                ))}
              </ol>
              <p className="form-row-desc" style={{ marginBottom: 0 }}>
                This gives you the same fast, app-like experience — right from your home screen.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
