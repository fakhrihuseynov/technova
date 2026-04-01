"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  MapPin,
  ExternalLink,
  Tag,
  Users,
  Globe,
  Wifi,
} from "lucide-react";
import type { TechEvent, AIEnrichment } from "@/lib/providers/types";

interface EventCardProps {
  event: TechEvent;
}

function formatDate(iso: string): string {
  if (!iso) return "Date TBD";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AISkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-2">
      <div className="h-3 bg-green-100 rounded w-full" />
      <div className="h-3 bg-green-100 rounded w-4/5" />
      <div className="flex gap-1 mt-1">
        <div className="h-5 w-16 bg-green-100 rounded-full" />
        <div className="h-5 w-14 bg-green-100 rounded-full" />
      </div>
    </div>
  );
}

export default function EventCard({ event }: EventCardProps) {
  const [ai, setAi] = useState<AIEnrichment | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [ogImage, setOgImage] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement>(null);

  // Viewport-gate BOTH og-image fetch and AI enrichment — prevents 20+ simultaneous
  // requests on mount which queue up and cause timeouts.
  useEffect(() => {
    let cancelled = false;

    const node = cardRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        // ── OG image ──────────────────────────────────────────────────────────
        if (event.url) {
          fetch(`/api/og?url=${encodeURIComponent(event.url)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d?.image) setOgImage(d.image); })
            .catch(() => {});
        }

        // ── AI enrichment ─────────────────────────────────────────────────────
        async function enrich() {
          try {
            const res = await fetch("/api/ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventId: event.id,
                eventName: event.name,
                description: [event.category, event.venueName, event.city, event.country]
                  .filter(Boolean)
                  .join(", "),
              }),
            });
            if (!res.ok) return;
            const data: AIEnrichment = await res.json();
            if (!cancelled) setAi(data);
          } catch {
            // Silently degrade
          } finally {
            if (!cancelled) setAiLoading(false);
          }
        }

        enrich();
      },
      { rootMargin: "300px" } // start fetching before the card is fully visible
    );

    observer.observe(node);
    return () => { cancelled = true; observer.disconnect(); };
  }, [event.id, event.url, event.name, event.category, event.venueName, event.city, event.country]);

  const coverImg = ogImage ?? event.images?.[0];
  const isOnline = event.venueName === "Online Event" || event.country === "Worldwide";
  const locationParts = isOnline
    ? "Online"
    : [event.venueName, event.city, event.country]
        .filter((p, i, arr) => p && arr.indexOf(p) === i)
        .join(", ");

  // Deterministic gradient + initials derived from event name
  const GRADIENTS = [
    "from-violet-500 to-indigo-600",
    "from-sky-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-fuchsia-500 to-purple-600",
    "from-lime-500 to-green-600",
    "from-orange-500 to-red-600",
  ];
  const nameHash = event.name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const gradient = GRADIENTS[nameHash % GRADIENTS.length];
  const initials = event.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <article ref={cardRef} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col relative cursor-pointer">
      {/* Stretched link — makes whole card clickable without nesting <a> tags */}
      {event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-50"
          aria-label={`Open ${event.name}`}
        />
      )}
      {/* Cover image / placeholder — always show gradient, overlay real image when loaded */}
      <div className={`w-full h-44 relative overflow-hidden bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-2`}>
        {/* Decorative circles always visible beneath real image */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-4 w-36 h-36 rounded-full bg-black/10" />
        {!coverImg && (
          <>
            <span className="text-5xl font-extrabold text-white/90 drop-shadow select-none z-10">
              {initials}
            </span>
            {event.category && (
              <span className="text-xs font-semibold text-white/80 uppercase tracking-widest z-10">
                {event.category}
              </span>
            )}
          </>
        )}
        {/* Online badge */}
        {isOnline && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-green-500 text-white text-xs font-semibold rounded-full px-2.5 py-1 shadow-sm">
            <Wifi className="w-3 h-3" />
            Online
          </div>
        )}
        {/* Real OG image fades in on top once loaded */}
        {coverImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImg}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover animate-fadeIn z-20"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2">
          {event.name}
        </h3>

        {/* Meta */}
        <div className="flex flex-col gap-1.5 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            <span>{formatDate(event.startDateTime)}</span>
          </div>
          {locationParts && (
            <div className="flex items-start gap-1.5">
              {isOnline
                ? <Wifi className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                : <MapPin className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              }
              <span className="line-clamp-2">{locationParts}</span>
            </div>
          )}
        </div>

        {/* AI enrichment panel */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm min-h-[88px] flex flex-col gap-2">
          {aiLoading ? (
            <AISkeleton />
          ) : ai && ai.confidence > 0 ? (
            <>
              <p className="text-gray-700 leading-snug">{ai.summary}</p>

              {ai.bestFor.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Users className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  {ai.bestFor.map((role) => (
                    <span
                      key={role}
                      className="text-xs bg-green-600 text-white rounded-full px-2 py-0.5 font-medium"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}

              {ai.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  {ai.tags.map((tag) => (
                    <span key={tag} className="text-xs text-green-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2 my-auto">
              {event.category && (
                <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">
                  {event.category} conference
                </p>
              )}
              <p className="text-gray-500 text-xs">
                {isOnline
                  ? "Attend this event online from anywhere in the world."
                  : `In-person event in ${event.city || event.country || "a listed city"}.`}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons — sit above the stretched link via z-index */}
        <div className="relative z-20 flex flex-wrap gap-2 mt-auto pt-1">
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Event
            </a>
          )}
          {event.socialLinks.map((link) => (
            <a
              key={link}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              Social
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}
