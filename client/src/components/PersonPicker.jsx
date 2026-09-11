import { useMemo, useState } from "react";

export default function PersonPicker({ people, value, onChange, excludeIds = [], placeholder }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const selected = people.find((p) => p.id === value);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim();
    return people.filter((p) => !excluded.has(p.id) && p.name.includes(q)).slice(0, 30);
  }, [query, people, excluded]);

  return (
    <div className="person-picker">
      <input
        type="text"
        value={query || selected?.name || ""}
        placeholder={placeholder || "ابحث عن اسم..."}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {value && (
        <button
          type="button"
          className="picker-clear"
          onMouseDown={(e) => {
            e.preventDefault();
            onChange(null);
            setQuery("");
          }}
        >
          ✕
        </button>
      )}
      {open && results.length > 0 && (
        <ul className="picker-results">
          {results.map((p) => (
            <li
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(p.id);
                setQuery("");
                setOpen(false);
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
