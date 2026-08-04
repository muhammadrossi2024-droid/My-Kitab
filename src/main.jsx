import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { ProgressProvider } from "./context/ProgressContext.jsx";
import { IntroProvider } from "./context/IntroContext.jsx";
import { NavVisibilityProvider } from "./context/NavVisibilityContext.jsx";
import { PremiumProvider } from "./context/PremiumContext.jsx";
import { TopBannerVisibilityProvider } from "./context/TopBannerVisibilityContext.jsx";
import { AudioPlayerProvider } from "./context/AudioPlayerContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <ProgressProvider>
          <IntroProvider>
            <NavVisibilityProvider>
              <TopBannerVisibilityProvider>
                <PremiumProvider>
                  <AudioPlayerProvider>
                    <BrowserRouter>
                      <App />
                    </BrowserRouter>
                  </AudioPlayerProvider>
                </PremiumProvider>
              </TopBannerVisibilityProvider>
            </NavVisibilityProvider>
          </IntroProvider>
        </ProgressProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>
);

// Registered after the page has finished loading so it can't compete with
// the app's own initial-load network requests — offline caching is only
// useful for the *next* visit anyway.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app works the same without offline support, just
      // without it.
    });
  });
}
