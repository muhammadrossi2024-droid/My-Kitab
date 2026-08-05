import { useSettings } from "../context/SettingsContext.jsx";
import athkarData from "../data/athkar/morning-evening.json";
import ArabicText from "./ArabicText.jsx";

// The actual dua content for one timing ("morning" | "evening") — shared by
// the /athkar/morning and /athkar/evening pages so the same rendering (and
// the same source credit) isn't duplicated between them.
export default function AthkarDuaList({ mode }) {
  const { settings } = useSettings();

  const duas = athkarData.duas.filter((d) => d.timing === "both" || d.timing === mode);

  return (
    <>
      {duas.map((dua) => {
        const variant = dua.morning && dua.evening ? dua[mode] : dua;
        return (
          <div className="athkar-dua-card" key={dua.number}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span className="ayah-number-badge">Dua {dua.number}</span>
              {dua.repetition && (
                <span className="ayah-number-badge athkar-repetition-badge">{dua.repetition}</span>
              )}
            </div>
            <p className="ayah-arabic" style={{ fontSize: settings.arabicFontSize }}>
              <ArabicText text={variant.arabic} />
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
    </>
  );
}
