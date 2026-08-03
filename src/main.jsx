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
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <ProgressProvider>
          <IntroProvider>
            <NavVisibilityProvider>
              <PremiumProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </PremiumProvider>
            </NavVisibilityProvider>
          </IntroProvider>
        </ProgressProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>
);
