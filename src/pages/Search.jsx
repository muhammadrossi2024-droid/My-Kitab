import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/SettingsContext.jsx";
import { runSearch } from "../utils/search.js";

function ResultCard({ item, onOpen }) {
  const { settings } = useSettings();
  const label = item.type === "quran" ? item.label : item.label;
  return (
    <button className="search-result" onClick={() => onOpen(item)}>
      <div className="search-result-ref">
        {label}
        {item.heading && <span className="search-result-heading"> · {item.heading}</span>}
      </div>
      {item.arabic && (
        <p
          className="ayah-arabic"
          style={{ fontSize: Math.min(settings.arabicFontSize, 28), margin: "6px 0" }}
        >
          {item.arabic}
        </p>
      )}
      {item.translation && (
        <p
          className="ayah-translation"
          style={{ fontSize: Math.min(settings.translationFontSize, 16) }}
        >
          {item.translation}
        </p>
      )}
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

  function openItem(item) {
    navigate(item.link);
  }

  return (
    <div>
      <h1>Search</h1>
      <input
        className="search-input"
        placeholder="Search a word or topic — English or Arabic"
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
            .filter((g) => g.results.length > 0)
            .map((g) => (
              <details className="search-section" open key={g.topic.id}>
                <summary>
                  {g.topic.en} <span className="search-section-count">({g.results.length})</span>
                </summary>
                <div className="search-results-grid">
                  {g.results.map((item) => (
                    <ResultCard item={item} onOpen={openItem} key={item.link} />
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
                {result.literalMatches.map((item) => (
                  <ResultCard item={item} onOpen={openItem} key={item.link} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {!query.trim() && (
        <div className="empty-state">
          Try searching a word ("mercy"), an Arabic phrase ("الصبر"), or a topic ("reliance on
          Allah"). Results are pulled from the Qur'an, Mutoon, and Hadith.
        </div>
      )}
    </div>
  );
}
