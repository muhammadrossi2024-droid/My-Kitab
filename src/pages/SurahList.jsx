import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";

export default function SurahList() {
  const { lastRead } = useSettings();
  const [surahs, setSurahs] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  const lastSurahMeta =
    surahs && lastRead && surahs.find((s) => s.number === lastRead.surah);

  useEffect(() => {
    fetch("/data/surahs/index.json")
      .then((res) => {
        if (!res.ok) throw new Error("index.json not found");
        return res.json();
      })
      .then(setSurahs)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!surahs) return [];
    const q = query.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.transliteration.toLowerCase().includes(q) ||
        s.englishMeaning.toLowerCase().includes(q) ||
        String(s.number) === q
    );
  }, [surahs, query]);

  if (error) {
    return (
      <div className="empty-state">
        Couldn't load the surah list ({error}). Run the scraper first: <code>npm run scrape</code>
      </div>
    );
  }

  if (!surahs) {
    return <div className="loading-state">Loading surahs…</div>;
  }

  return (
    <div>
      <div className="card" data-tour="continue-reading" style={{ marginBottom: 16 }}>
        <div className="form-row-label">Continue Reading</div>
        {lastRead && lastSurahMeta ? (
          <>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: "2px 0 8px" }}>
              Updates automatically when you tap "Mark as last read" on any ayah.
            </p>
            <p className="form-row-desc" style={{ marginBottom: 12 }}>
              You left off at Surah {lastSurahMeta.transliteration}, verse {lastRead.ayah}.
            </p>
            <Link className="btn btn-primary" to={`/surah/${lastRead.surah}#ayah-${lastRead.ayah}`}>
              Resume Reading
            </Link>
          </>
        ) : (
          <p className="form-row-desc" style={{ marginTop: 2, marginBottom: 0 }}>
            Nothing saved yet. Open any surah and tap "🔖 Mark as last read" under an ayah to save
            your place — it'll show up here so you can jump straight back to it.
          </p>
        )}
      </div>

      <input
        className="search-input"
        placeholder="Search by name or number…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="surah-list">
        {filtered.map((s) => (
          <li key={s.number}>
            <Link className="surah-list-item" to={`/surah/${s.number}`}>
              <span className="surah-badge">{s.number}</span>
              <span className="surah-meta">
                <div className="surah-name-en">{s.transliteration}</div>
                <div className="surah-name-sub">
                  {s.englishMeaning} · {s.revelationType} · {s.verseCount} verses
                  {!s.scraped && " · not yet scraped"}
                </div>
              </span>
              <span className="surah-arabic-name">{s.arabic}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
