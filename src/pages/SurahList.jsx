import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useSettings } from "../context/SettingsContext.jsx";
import SectionHero from "../components/SectionHero.jsx";

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
      <SectionHero
        icon={BookOpen}
        image="/hero-quran.jpg"
        imagePosition="center 44%"
        fadeMid="14%"
        fadeEnd="36%"
        contentMaxWidth="20%"
        title="The Noble Quran"
        description="Read the Noble Qur'an with Arabic text and English translation, saved locally so it loads instantly."
      />

      <input
        className="search-input"
        placeholder="Search by name or number…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {lastRead && lastSurahMeta && (
        <Link
          className="btn btn-primary resume-reading-link"
          to={`/surah/${lastRead.surah}#ayah-${lastRead.ayah}`}
        >
          Resume Reading
        </Link>
      )}

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
