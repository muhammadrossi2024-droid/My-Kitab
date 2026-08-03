import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import athkarData from "../data/athkar/morning-evening.json";
import SectionHero from "../components/SectionHero.jsx";

export default function Athkar() {
  const { settings } = useSettings();
  const [mode, setMode] = useState("morning"); // "morning" | "evening"

  const duas = athkarData.duas.filter(
    (d) => d.timing === "both" || d.timing === mode
  );

  return (
    <div>
      <SectionHero
        icon={Sparkles}
        image="/hero-athkar.jpg"
        imagePosition="75% 45%"
        title="Athkar"
        description="Authentic supplications for the morning and evening, with translation and references."
      />

      <div className="reader-header">
        <div className="surah-arabic-name" style={{ fontSize: "2rem" }}>
          {athkarData.title.arabic}
        </div>
        <h1 style={{ margin: "8px 0 4px" }}>{athkarData.title.english}</h1>

        <div className="segmented-control" style={{ margin: "18px auto 0" }}>
          <button
            className={"segmented-control-btn" + (mode === "morning" ? " active" : "")}
            onClick={() => setMode("morning")}
          >
            Morning
          </button>
          <button
            className={"segmented-control-btn" + (mode === "evening" ? " active" : "")}
            onClick={() => setMode("evening")}
          >
            Evening
          </button>
        </div>
      </div>

      <div className="card">
        {duas.map((dua) => {
          const variant = dua.morning && dua.evening ? dua[mode] : dua;
          return (
            <div className="ayah-block" key={dua.number}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span className="ayah-number-badge">Dua {dua.number}</span>
                {dua.repetition && (
                  <span className="ayah-number-badge athkar-repetition-badge">
                    {dua.repetition}
                  </span>
                )}
              </div>
              <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
                {variant.arabic}
              </p>
              <p className="athkar-transliteration">{variant.transliteration}</p>
              <p className="ayah-translation" style={{ fontSize: settings.translationFontSize }}>
                {variant.translation}
              </p>
              {dua.virtue && <p className="athkar-virtue">{dua.virtue}</p>}
              <p className="hadith-source">{dua.reference}</p>
            </div>
          );
        })}
      </div>

      <p className="athkar-credit">
        Compiled with reference to <em>Authentic Morning and Evening Supplications and Remembrances for Every Muslim</em>{" "}
        by Abu Khadeejah ʿAbdul-Wāhid Alam, published by Salafi Publications —{" "}
        <a href="https://www.salafibookstore.com" target="_blank" rel="noopener noreferrer">
          salafibookstore.com
        </a>{" "}
        /{" "}
        <a href="https://www.salafipubs.com" target="_blank" rel="noopener noreferrer">
          salafipubs.com
        </a>
        .
      </p>
    </div>
  );
}
