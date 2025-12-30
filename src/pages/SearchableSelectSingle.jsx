import React, { useEffect, useMemo, useRef, useState } from "react";

const norm = (s) => String(s ?? "").trim().toLowerCase();

export default function SearchableSelectSingle({
  value,
  onChange,
  options,
  placeholder = "Выберите...",
  disabled = false,
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const opts = Array.isArray(options) ? options : [];

  const filtered = useMemo(() => {
    const query = norm(q);
    if (!query) return opts;
    return opts.filter((o) => norm(o?.label).includes(query));
  }, [opts, q]);

  const selected = useMemo(() => {
    const v = String(value ?? "");
    return opts.find((o) => String(o.value) === v) || null;
  }, [opts, value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const pick = (opt) => {
    onChange?.(opt?.value ?? "");
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={wrapRef} className={`relative ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={[
          "w-full border rounded-md px-3 py-2 bg-white text-left",
          "hover:bg-gray-50 transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        ].join(" ")}
        aria-expanded={open}
      >
        <span className={selected ? "text-gray-900" : "text-gray-500"}>
          {selected ? selected.label : placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              placeholder="Поиск..."
            />
          </div>

          <div className="max-h-64 overflow-auto">
            {filtered.length ? (
              filtered.map((o) => (
                <button
                  key={String(o.value)}
                  type="button"
                  onClick={() => pick(o)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 transition"
                >
                  {o.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-gray-600">Ничего не найдено</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
