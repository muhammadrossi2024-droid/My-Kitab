import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { ProgressProvider } from "./context/ProgressContext.jsx";
import { IntroProvider } from "./context/IntroContext.jsx";
import { NavVisibilityProvider } from "./context/NavVisibilityContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SettingsProvider>
      <ProgressProvider>
        <IntroProvider>
          <NavVisibilityProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </NavVisibilityProvider>
        </IntroProvider>
      </ProgressProvider>
    </SettingsProvider>
  </StrictMode>
);
