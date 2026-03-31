"use client";

import { useState } from "react";
import { MapPin, Zap, Search, Loader2, ChevronRight } from "lucide-react";
import Header from "@/components/Header";
import EventGrid from "@/components/EventGrid";

interface Location {
  lat: number;
  lng: number;
  label: string;
}

// ─── Geocode helper (client-safe, no API key needed) ─────────────────────────
async function geocodeCity(query: string): Promise<Location | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`,
    { headers: { "Accept-Language": "en", "User-Agent": "TechNova/1.0" } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    label: data[0].display_name,
  };
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage({
  onLocation,
}: {
  onLocation: (loc: Location) => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState("");

  function handleDetect() {
    if (!navigator.geolocation) {
      setErr("Geolocation is not supported by your browser.");
      return;
    }
    setDetecting(true);
    setErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Your Location",
        });
      },
      () => {
        setErr("Location access denied. Search a city manually below.");
        setDetecting(false);
      },
      { timeout: 10_000 }
    );
  }

  async function handleCitySearch(e: React.FormEvent) {
    e.preventDefault();
    const q = cityInput.trim();
    if (!q) return;
    setSearching(true);
    setErr("");
    try {
      const loc = await geocodeCity(q);
      if (!loc) {
        setErr("City not found. Try a different query.");
        return;
      }
      onLocation(loc);
    } catch {
      setErr("Geocoding failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 flex flex-col">
      {/* Hero */}
      <main className="flex flex-col items-center justify-center flex-1 px-4 text-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-green-600" />
            <span className="text-5xl font-extrabold text-green-700 tracking-tight">
              TechNova
            </span>
          </div>
          <p className="text-gray-500 text-lg max-w-xs sm:max-w-sm">
            Discover tech events near you, summarised and curated by AI.
          </p>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {/* Geolocation button */}
          <button
            onClick={handleDetect}
            disabled={detecting}
            className="flex items-center justify-center gap-2.5 w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition-colors shadow-lg shadow-green-200"
          >
            {detecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
            {detecting ? "Detecting location…" : "Use My Location"}
            {!detecting && <ChevronRight className="w-4 h-4 ml-auto" />}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">
              or search manually
            </span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {/* City search */}
          <form onSubmit={handleCitySearch} className="flex gap-2">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => {
                setCityInput(e.target.value);
                setErr("");
              }}
              placeholder="e.g. Tbilisi, Georgia"
              className="flex-1 border border-gray-300 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={searching || !cityInput.trim()}
              className="flex items-center gap-1.5 bg-white border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Go
            </button>
          </form>

          {/* Error */}
          {err && (
            <p className="text-sm text-red-500 text-center -mt-1">{err}</p>
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-400 max-w-xs">
          Events powered by{" "}
          <span className="font-medium text-gray-500">Ticketmaster</span> ·
          Summaries by{" "}
          <span className="font-medium text-gray-500">Ollama AI</span>
        </p>
      </main>
    </div>
  );
}

// ─── Main app shell ───────────────────────────────────────────────────────────
export default function Home() {
  const [location, setLocation] = useState<Location | null>(null);

  function handleLocationChange(lat: number, lng: number, label: string) {
    setLocation({ lat, lng, label });
  }

  if (!location) {
    return <LandingPage onLocation={setLocation} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onLocationChange={handleLocationChange}
        currentLocation={location.label}
      />
      <main className="max-w-5xl mx-auto px-4">
        <div className="pt-4 pb-2">
          <p className="text-sm text-gray-500">
            Showing tech events near{" "}
            <span className="font-medium text-gray-700 truncate inline-block max-w-xs align-bottom">
              {location.label}
            </span>
          </p>
        </div>
        <EventGrid lat={location.lat} lng={location.lng} />
      </main>
    </div>
  );
}
