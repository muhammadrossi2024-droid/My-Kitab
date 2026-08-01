import { useSettings } from "../context/SettingsContext.jsx";
import { reciters, getReciter, supportsWordTiming } from "../data/reciters.js";

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const reciterSupportsWord = supportsWordTiming(settings.reciter);
  const wordModeUnavailable = settings.followAlong === "word" && !reciterSupportsWord;

  return (
    <div>
      <h1>Settings</h1>

      <div className="card">
        <div className="form-row">
          <div>
            <div className="form-row-label">Theme</div>
            <div className="form-row-desc">Switch between light and dark appearance.</div>
          </div>
          <div className="theme-toggle-group">
            <button
              className={"theme-toggle-btn" + (settings.theme === "light" ? " active" : "")}
              onClick={() => updateSettings({ theme: "light" })}
            >
              Light
            </button>
            <button
              className={"theme-toggle-btn" + (settings.theme === "dark" ? " active" : "")}
              onClick={() => updateSettings({ theme: "dark" })}
            >
              Dark
            </button>
          </div>
        </div>

        <div className="form-row">
          <div>
            <div className="form-row-label">Display</div>
            <div className="form-row-desc">Choose what to show for each verse.</div>
          </div>
          <div className="theme-toggle-group">
            <button
              className={"theme-toggle-btn" + (settings.displayMode === "arabic" ? " active" : "")}
              onClick={() => updateSettings({ displayMode: "arabic" })}
            >
              Arabic only
            </button>
            <button
              className={"theme-toggle-btn" + (settings.displayMode === "english" ? " active" : "")}
              onClick={() => updateSettings({ displayMode: "english" })}
            >
              English only
            </button>
            <button
              className={"theme-toggle-btn" + (settings.displayMode === "both" ? " active" : "")}
              onClick={() => updateSettings({ displayMode: "both" })}
            >
              Side-by-side
            </button>
          </div>
        </div>

        <div className="form-row">
          <div>
            <div className="form-row-label">Reciter</div>
            <div className="form-row-desc">Verse-by-verse recitation audio.</div>
          </div>
          <select
            className="select-input"
            value={settings.reciter}
            onChange={(e) => updateSettings({ reciter: e.target.value })}
          >
            {reciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div>
            <div className="form-row-label">Follow-along</div>
            <div className="form-row-desc">How highlighting tracks the recitation during playback.</div>
          </div>
          <div className="theme-toggle-group">
            <button
              className={"theme-toggle-btn" + (settings.followAlong === "word" ? " active" : "")}
              onClick={() => updateSettings({ followAlong: "word" })}
            >
              Word-by-word
            </button>
            <button
              className={"theme-toggle-btn" + (settings.followAlong === "ayah" ? " active" : "")}
              onClick={() => updateSettings({ followAlong: "ayah" })}
            >
              Ayah-by-ayah
            </button>
          </div>
        </div>
        {wordModeUnavailable && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: -8, marginBottom: 14 }}>
            {getReciter(settings.reciter).name} doesn't have word-level timing data, so playback will
            use ayah-by-ayah tracking instead.
          </p>
        )}

        <div className="form-row">
          <div>
            <div className="form-row-label">Arabic Font Size</div>
            <div className="form-row-desc">{settings.arabicFontSize}px</div>
          </div>
          <input
            type="range"
            min="20"
            max="48"
            value={settings.arabicFontSize}
            onChange={(e) => updateSettings({ arabicFontSize: parseInt(e.target.value, 10) })}
          />
        </div>

        <div className="form-row">
          <div>
            <div className="form-row-label">Translation Font Size</div>
            <div className="form-row-desc">{settings.translationFontSize}px</div>
          </div>
          <input
            type="range"
            min="12"
            max="26"
            value={settings.translationFontSize}
            onChange={(e) =>
              updateSettings({ translationFontSize: parseInt(e.target.value, 10) })
            }
          />
        </div>
      </div>

      <div className="card">
        <div className={settings.displayMode === "both" ? "ayah-side-by-side" : undefined}>
          {settings.displayMode !== "english" && (
            <p
              className="ayah-arabic"
              style={{ fontSize: settings.arabicFontSize, marginBottom: 8 }}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
          )}
          {settings.displayMode !== "arabic" && (
            <p className="ayah-translation" style={{ fontSize: settings.translationFontSize }}>
              In the Name of Allah, The Most-Merciful, the Ever-Merciful. (preview)
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <button className="btn" onClick={resetSettings}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
