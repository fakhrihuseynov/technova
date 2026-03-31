// Common TechEvent shape normalised from any provider
export interface TechEvent {
  id: string;
  name: string;
  startDateTime: string;
  endDateTime?: string;
  venueName: string;
  address: string;
  city: string;
  country: string;
  /** Official event webpage */
  url: string;
  /** Topic/category label (e.g. "javascript", "devops") */
  category?: string;
  contacts: string[];
  socialLinks: string[];
  images: string[];
  rawProviderPayload?: unknown;
}

// Params accepted by any event-fetching provider
export interface FetchEventsParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  page?: number;
  size?: number;
  /** Free-text search against event name */
  q?: string;
  /** Filter to a specific country (exact match from dataset) */
  country?: string;
  /** Show only purely-online events */
  onlineOnly?: boolean;
}

// Pagination-aware response
export interface EventsPage {
  events: TechEvent[];
  page: number;
  totalPages: number;
  /** All countries present in the unfiltered result set for this location */
  availableCountries?: string[];
}

// AI enrichment result from Ollama
export interface AIEnrichment {
  summary: string;
  bestFor: string[];
  tags: string[];
  confidence: number;
}
