"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search, Globe, X, Navigation } from "lucide-react";
import EventCard from "./EventCard";
import type { TechEvent } from "@/lib/providers/types";

interface EventGridProps {
  lat: number;
  lng: number;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="w-full h-44 bg-gray-200" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex flex-col gap-2 min-h-[88px]">
          <div className="h-3 bg-green-100 rounded w-full" />
          <div className="h-3 bg-green-100 rounded w-4/5" />
          <div className="flex gap-1 mt-1">
            <div className="h-5 w-16 bg-green-100 rounded-full" />
            <div className="h-5 w-14 bg-green-100 rounded-full" />
          </div>
        </div>
        <div className="h-7 bg-gray-100 rounded-lg w-28 mt-1" />
      </div>
    </div>
  );
}

export default function EventGrid({ lat, lng }: EventGridProps) {
  const [events, setEvents] = useState<TechEvent[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Search & filter state ────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced commit value
  const [country, setCountry] = useState("all");
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [maxDist, setMaxDist] = useState("1000");
  const [docked, setDocked] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loaderRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  // ── Core fetch ────────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean, q: string, countryFilter: string) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          page: String(pageNum),
          radiusKm: maxDist,
        });
        if (q) params.set("q", q);
        if (countryFilter === "__online__") {
          params.set("onlineOnly", "1");
        } else if (countryFilter && countryFilter !== "all") {
          params.set("country", countryFilter);
        }

        const res = await fetch(`/api/events?${params}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        const incoming: TechEvent[] = data.events ?? [];

        setEvents((prev) => (replace ? incoming : [...prev, ...incoming]));
        setTotalPages(data.totalPages ?? 1);
        setPage(pageNum);

        // Populate country dropdown from the first unfiltered load
        if (pageNum === 0 && replace && data.availableCountries?.length) {
          setAvailableCountries(data.availableCountries);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [lat, lng, maxDist]
  );

  // Dock the filter bar when it scrolls past the header (sticky top-0 header ≈ 56px)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setDocked(!entry.isIntersecting),
      { rootMargin: "-57px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Reset + reload whenever location, debounced search, country, or distance changes
  useEffect(() => {
    setEvents([]);
    setPage(0);
    setTotalPages(1);
    fetchingRef.current = false;
    fetchPage(0, true, search, country);
  }, [fetchPage, search, country]);

  // Debounce search input (350 ms)
  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val.trim()), 350);
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
  }

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = loaderRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fetchingRef.current) {
          setPage((currentPage) => {
            setTotalPages((currentTotal) => {
              if (currentPage < currentTotal - 1) {
                fetchPage(currentPage + 1, false, search, country);
              }
              return currentTotal;
            });
            return currentPage;
          });
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPage, search, country]);

  const hasMore = page < totalPages - 1;
  const isFiltered = search !== "" || country !== "all" || maxDist !== "1000";

  return (
    <div className="py-4">
      {/* Sentinel — sits just above the filter bar. When it scrolls off-screen
          (past the sticky header) the observer flips docked=true. */}
      <div ref={sentinelRef} className="h-px" />

      {/* ── Search & filter bar ─────────────────────────────────────────── */}
      <div
        className={`sticky top-[57px] z-40 transition-all duration-200 ${
          docked
            ? "bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm -mx-4 px-4 py-2.5 mb-3"
            : "mb-5"
        }`}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-2">
        {/* Name search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, city, or topic…"
            className="w-full border border-gray-300 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Distance filter */}
        <div className="relative">
          <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={maxDist}
            onChange={(e) => setMaxDist(e.target.value)}
            className="appearance-none border border-gray-300 rounded-xl pl-9 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent cursor-pointer"
          >
            <option value="500">Within 500 km</option>
            <option value="1000">Within 1,000 km</option>
            <option value="2000">Within 2,000 km</option>
            <option value="3000">Within 3,000 km</option>
            <option value="5000">Within 5,000 km</option>
            <option value="999999">Worldwide</option>
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Country + online filter */}
        {availableCountries.length > 0 && (
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="appearance-none border border-gray-300 rounded-xl pl-9 pr-8 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent min-w-[160px] cursor-pointer"
            >
              <option value="all">All countries</option>
              <option value="__online__">🌐 Online only</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}

        {/* Clear-all badge */}
        {isFiltered && (
          <button
            onClick={() => { clearSearch(); setCountry("all"); setMaxDist("1000"); }}
            className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 rounded-xl px-3 py-2 transition-colors whitespace-nowrap"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-4 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-2">
          <p className="text-red-600 text-sm font-medium">{error}</p>
          <button
            onClick={() => { fetchingRef.current = false; fetchPage(0, true, search, country); }}
            className="self-start text-xs text-red-600 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!loading && !error && events.length === 0 && (
        <div className="text-center py-24 text-gray-400">
          <p className="text-xl font-semibold text-gray-500">
            {isFiltered ? "No events match your filters" : "No tech events found nearby"}
          </p>
          <p className="text-sm mt-2">
            {isFiltered
              ? "Try a different search term or country."
              : "Try a different city or expanding the radius."}
          </p>
          {isFiltered && (
            <button
              onClick={() => { clearSearch(); setCountry("all"); setMaxDist("1000"); }}
              className="mt-4 text-sm text-green-600 underline hover:text-green-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
      </div>

      {/* Infinite-scroll sentinel */}
      <div ref={loaderRef} className="h-20" />

      {/* End of results */}
      {!hasMore && events.length > 0 && !loading && (
        <p className="text-center text-sm text-gray-400 pb-8">
          {isFiltered
            ? `${events.length} result${events.length !== 1 ? "s" : ""} found`
            : "You've seen all nearby events! 🎉"}
        </p>
      )}
    </div>
  );
}
