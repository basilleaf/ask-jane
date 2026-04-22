"use client";

import { useCallback, useRef, useState } from "react";
import "./main.css";

type Passage = {
  id: number;
  novel: string;
  text: string;
  similarity: number;
};

type SearchResponse = {
  summary?: string;
  passages?: Passage[];
  error?: string;
};

const HINTS = [
  "money and marriage",
  "a woman's intelligence",
  "first impressions",
  "loneliness",
  "social obligation",
];

function formatContext(similarity: number) {
  const pct = Math.round(Math.min(1, Math.max(0, similarity)) * 100);
  return `${pct}% match`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [results, setResults] = useState<Passage[]>([]);
  const busyRef = useRef(false);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q || busyRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setError(null);
    setSearched(true);
    setSummary(null);
    setResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      const data = (await res.json()) as SearchResponse;

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setSummary(data.summary ?? null);
      setResults(data.passages ?? []);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void search();
    }
  };

  return (
    <div className="concordance">
      <div className="header">
        <div className="header-eyebrow">Jane Austen</div>
        <h1 className="header-title">
          <em>Ask</em> Jane
        </h1>
        <p className="header-sub">
          Search the novels by theme, feeling, or question
        </p>
      </div>

      <div className="search-area">
        <label className="search-label" htmlFor="concordance-query">
          Your Query
        </label>
        <div className="search-row">
          <input
            id="concordance-query"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. pride getting in the way of love"
            autoComplete="off"
          />
          <button
            type="button"
            className="search-btn"
            onClick={() => void search()}
            disabled={loading || !query.trim()}
          >
            {loading ? "Searching" : "Search"}
          </button>
        </div>

        <div className="hints">
          {HINTS.map((h) => (
            <button
              key={h}
              type="button"
              className="hint"
              onClick={() => setQuery(h)}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="results">
        {loading && (
          <div className="loading-state">
            Searching the novels
            <span className="loading-dots" />
          </div>
        )}

        {error && <div className="loading-state error-state">{error}</div>}

        {!loading && !error && searched && results.length === 0 && (
          <div className="empty-state">No passages found.</div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div className="divider" />
            {summary ? (
              <div className="summary-block">
                <div className="summary-label">Synthesis</div>
                <p className="summary-text">{summary}</p>
              </div>
            ) : null}
            {results.map((r, i) => (
              <div
                key={r.id}
                className="result-card"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <p className="result-quote">&ldquo;{r.text}&rdquo;</p>
                <div className="result-meta">
                  <span className="result-novel">{r.novel}</span>
                  <span className="result-context">
                    — {formatContext(r.similarity)}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
