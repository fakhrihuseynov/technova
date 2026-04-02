"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, LocateFixed, Loader2, Settings } from "lucide-react";
import LocationPicker from "./LocationPicker";

interface HeaderProps {
  onLocationChange: (lat: number, lng: number, label: string) => void;
  currentLocation?: string;
  onHome: () => void;
}

export default function Header({
  onLocationChange,
  currentLocation,
  onHome,
}: HeaderProps) {
  const [syncing, setSyncing] = useState(false);

  const now = new Date();
  const monthLabel = now.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  function handleSync() {
    if (!navigator.geolocation || syncing) return;
    setSyncing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let label = "Your Location";
        try {
          const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.label) label = data.label;
          }
        } catch { /* non-fatal */ }
        onLocationChange(lat, lng, label);
        setSyncing(false);
      },
      () => setSyncing(false),
      { timeout: 10_000 }
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo — click to return to landing */}
        <button
          onClick={onHome}
          className="flex-shrink-0 hover:opacity-75 transition-opacity"
        >
          <img src="/logo.svg" alt="TechNova" className="h-10 w-auto" />
        </button>

        {/* Month badge */}
        <span className="hidden sm:inline-flex items-center text-xs font-medium bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 flex-shrink-0">
          {monthLabel}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sync location button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          title="Sync current location"
          className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
        >
          {syncing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <LocateFixed className="w-4 h-4" />}
        </button>

        {/* Settings */}
        <Link href="/settings" className="flex-shrink-0 p-2 rounded-xl text-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors" title="Settings">
          <Settings className="w-4 h-4" />
        </Link>

        {/* Location */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-xs w-full sm:w-auto">
          <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
          <LocationPicker
            onLocationChange={onLocationChange}
            currentLocation={currentLocation}
          />
        </div>
      </div>
    </header>
  );
}
