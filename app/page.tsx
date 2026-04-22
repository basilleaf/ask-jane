import { Suspense } from "react";
import { Reader } from "./reader";
import "./main.css";

function ReaderFallback() {
  return (
    <div className="reader">
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
        <div className="loading-state" style={{ marginTop: "1.5rem" }}>
          Loading
          <span className="loading-dots" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<ReaderFallback />}>
      <Reader />
    </Suspense>
  );
}
