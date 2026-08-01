import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import { runSearch } from "../utils/search.js";

function ResultCard({ verse, onOpen }) {
  const { settings } = useSettings();
  return (
    <button className="search-result" onClick={() => onOpen(verse)}>
      <div className="search-result-ref">
        {verse.surahName} {verse.surah}:{verse.ayah}
      </div>
      <p className="ayah-arabic" style={{ fontSize: Math.min(settings.arabicFontSize, 28), margin: "6px 0" }}>
        {verse.arabic}
      </p>
      <p className="ayah-translation" style={{ fontSize: Math.min(settings.translationFontSize, 16) }}>
        {verse.translation}
      </p>
    </button>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const requestId = ++requestIdRef.current;
    debounceRef.current = setTimeout(async () => {
      const res = await runSearch(query);
      if (requestIdRef.current === requestId) {
        setResult(res);
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function openVerse(verse) {
    navigate(`/surah/${verse.surah}#ayah-${verse.ayah}`);
  }

  return (
    <div>
      <h1>Search</h1>
      <input
        className="search-input"
        placeholder="Search in English or Arabic — a word, or a topic like 'patience' or 'الصبر'…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {loading && <div className="loading-state">Searching…</div>}

      {!loading && result && result.isEmpty && (
        <div className="empty-state">
          No results for "{query}". Try a broader topic, e.g. "patience", "justice", "tawakkul", or
          type in Arabic.
        </div>
      )}

      {!loading && result && !result.isEmpty && (
        <div>
          {result.topicGroups
            .filter((g) => g.verses.length > 0)
            .map((g) => (
              <details className="search-section" open key={g.topic.id}>
                <summary>
                  {g.topic.en} <span className="search-section-count">({g.verses.length})</span>
                </summary>
                <div className="search-results-grid">
                  {g.verses.map((v) => (
                    <ResultCard verse={v} onOpen={openVerse} key={`${v.surah}:${v.ayah}`} />
                  ))}
                </div>
              </details>
            ))}

          {result.literalMatches.length > 0 && (
            <details className="search-section" open>
              <summary>
                Keyword Matches{" "}
                <span className="search-section-count">({result.literalMatches.length})</span>
              </summary>
              <div className="search-results-grid">
                {result.literalMatches.map((v) => (
                  <ResultCard verse={v} onOpen={openVerse} key={`${v.surah}:${v.ayah}`} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {!query.trim() && (
        <div className="empty-state">
          Try searching a word ("mercy"), an Arabic phrase ("الصبر"), or a topic ("reliance on
          Allah").
        </div>
      )}
    </div>
  );
}
