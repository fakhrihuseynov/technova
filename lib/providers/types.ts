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
}

// Pagination-aware response
export interface EventsPage {
  events: TechEvent[];
  page: number;
  totalPages: number;
}

// AI enrichment result from Ollama
export interface AIEnrichment {
  summary: string;
  bestFor: string[];
  tags: string[];
  confidence: number;
}
