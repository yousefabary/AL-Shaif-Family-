import { useMemo, useState } from "react";

export default function SearchBar({ people, onFocus }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return people.filter((p) => p.name.includes(query.trim())).slice(0, 20);
  }, [query, people]);

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="ابحث عن اسم في الشجرة..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((p) => (
            <li
              key={p.id}
              onClick={() => {
                onFocus(p.id);
                setQuery("");
              }}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
