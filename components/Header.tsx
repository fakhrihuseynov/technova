"use client";

import { MapPin, Zap } from "lucide-react";
import LocationPicker from "./LocationPicker";

interface HeaderProps {
  onLocationChange: (lat: number, lng: number, label: string) => void;
  currentLocation?: string;
}

export default function Header({
  onLocationChange,
  currentLocation,
}: HeaderProps) {
  const now = new Date();
  const monthLabel = now.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Zap className="w-5 h-5 text-green-600" />
          <span className="font-extrabold text-lg text-green-700 tracking-tight">
            TechNova
          </span>
        </div>

        {/* Month badge */}
        <span className="hidden sm:inline-flex items-center text-xs font-medium bg-green-100 text-green-700 rounded-full px-2.5 py-0.5 flex-shrink-0">
          {monthLabel}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

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
