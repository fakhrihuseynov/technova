"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const loaderRef = useRef<HTMLDivElement>(null);
  // Prevent duplicate in-flight fetches via ref (avoids stale-closure issues)
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/events?lat=${lat}&lng=${lng}&page=${pageNum}`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        const incoming: TechEvent[] = data.events ?? [];

        setEvents((prev) => (replace ? incoming : [...prev, ...incoming]));
        setTotalPages(data.totalPages ?? 1);
        setPage(pageNum);
      } catch (err) {
        console.error(err);
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [lat, lng]
  );

  // Reset + initial load whenever location changes
  useEffect(() => {
    setEvents([]);
    setPage(0);
    setTotalPages(1);
    fetchingRef.current = false;
    fetchPage(0, true);
  }, [fetchPage]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = loaderRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fetchingRef.current) {
          // Read latest page/totalPages via stateful setter callback
          setPage((currentPage) => {
            setTotalPages((currentTotal) => {
              if (currentPage < currentTotal - 1) {
                fetchPage(currentPage + 1, false);
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
  }, [fetchPage]);

  const hasMore = page < totalPages - 1;

  return (
    <div className="py-6">
      {/* Error state */}
      {error && (
        <div className="mb-4 px-4 py-4 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-2">
          <p className="text-red-600 text-sm font-medium">{error}</p>
          <button
            onClick={() => fetchPage(0, true)}
            className="self-start text-xs text-red-600 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && events.length === 0 && (
        <div className="text-center py-24 text-gray-400">
          <p className="text-xl font-semibold text-gray-500">
            No tech events found nearby
          </p>
          <p className="text-sm mt-2">
            Try searching a different city or expanding the radius.
          </p>
        </div>
      )}

      {/* Event grid — 1 col mobile, 2 col ≥ sm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}

        {/* Skeleton placeholders while loading */}
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
      </div>

      {/* Infinite-scroll sentinel */}
      <div ref={loaderRef} className="h-20" />

      {/* End-of-results message */}
      {!hasMore && events.length > 0 && !loading && (
        <p className="text-center text-sm text-gray-400 pb-8">
          You&apos;ve seen all events for this month! 🎉
        </p>
      )}
    </div>
  );
}
