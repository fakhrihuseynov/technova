"use client";

import { useState, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

interface LocationPickerProps {
  onLocationChange: (lat: number, lng: number, label: string) => void;
  currentLocation?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// ─── Geocode via server-side proxy (avoids Nominatim CORS restrictions) ────────
async function geocode(query: string): Promise<NominatimResult | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data: NominatimResult[] = await res.json();
  return data[0] ?? null;
}

export default function LocationPicker({
  onLocationChange,
  currentLocation,
}: LocationPickerProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    setLoading(true);
    setError("");

    try {
      const result = await geocode(query);
      if (!result) {
        setError("City not found");
        return;
      }
      onLocationChange(
        parseFloat(result.lat),
        parseFloat(result.lon),
        result.display_name
      );
      setInput("");
      inputRef.current?.blur();
    } catch {
      setError("Geocoding failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1 w-full">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError("");
        }}
        placeholder={currentLocation ?? "Enter city…"}
        className="flex-1 min-w-0 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent truncate"
        aria-label="Search city"
      />
      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="flex-shrink-0 rounded-lg p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
        aria-label="Search"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </button>
      {error && (
        <span className="text-xs text-red-500 flex-shrink-0">{error}</span>
      )}
    </form>
  );
}
