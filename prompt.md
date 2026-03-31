You are a senior full‑stack engineer. Build a production‑ready web app named “TechNova”.

GOAL
TechNova is a “news feed” web app focused only on technology events. It detects the user’s location, fetches the latest tech events near them, and uses an Ollama model to summarize each event and recommend who it’s best for.

TECH STACK (must follow)
- Node.js + TypeScript
- Next.js (App Router)
- TailwindCSS for styling
- Use a clean component structure
- Use environment variables via .env.local
- Use the official Ollama JavaScript library (npm package `ollama`) OR call Ollama REST API directly (your choice).
- Use Ticketmaster Discovery API as the initial event provider.
- Implement infinite scroll using IntersectionObserver (no heavy state libraries required unless you want).

FUNCTIONAL REQUIREMENTS
1) Location
- On first load show a landing page with a clear “Enable location” button.
- When user agrees, request geolocation via browser.
- Provide a manual location override (City, Country). Example: user enters “Tbilisi, Georgia”.
- For manual location: use a geocoding method (choose a free approach or stub it with a TODO and clean interface) so the app can fetch events by coordinates.

2) Event fetching
- Create a provider module: `src/lib/providers/ticketmaster.ts`
- Call Ticketmaster Discovery API using `TICKETMASTER_API_KEY`.
- Fetch events by lat/lng radius and by date range (current month by default).
- Normalize output to a common `TechEvent` type:
  - id, name, startDateTime, endDateTime (optional)
  - venueName, address, city, country
  - url (official page)
  - contacts/organizer if available
  - socialLinks[] if discoverable (otherwise empty)
  - images[]
  - rawProviderPayload (optional)
- Implement pagination and infinite scroll: load N events, then load more when user scrolls near bottom.

3) AI enrichment (Ollama)
For each event, call Ollama to generate:
- 1–2 sentence summary
- “bestFor” list (e.g., DevOps, Backend, Frontend, Data, Students, Founders)
- tags/topics list
- confidence score 0..1
IMPORTANT: Force the model to output valid JSON only. Use a JSON schema or strict JSON mode.
Cache AI results per event id to avoid repeated calls.

4) UI/UX Design
- Full responsive layout, mobile first.
- Theme: green + white + very light gray.
- Landing page must look modern and simple.
- Use consistent icons (e.g., lucide-react).
- Event feed page:
  - Cards (“frames”) with name, date, address, buttons to open event page / socials.
  - Desktop: 2 columns (left/right), mobile: 1 column.
  - Infinite scroll adds more cards continuously.
- Add a top bar with:
  - app name TechNova
  - location selector
  - “This month” filter label
- Loading states: skeleton cards.
- Error handling: show friendly messages.

NON‑FUNCTIONAL
- Security: never expose secrets to client.
- Performance: caching for event API and AI enrichment (memory cache is OK for MVP).
- Code quality: clean types, separation of concerns, no messy single file.

DELIVERABLES
Generate the full repository code with:
- package.json scripts (dev/build/start)
- README with setup instructions
- .env.example
- Next.js app code in /src
- Minimal but nice UI
- API routes:
  - GET /api/events
  - POST /api/ai/enrich

DEFAULTS
- Default month filter = current month
- Default radius = 50km (configurable)
- Default Ollama model = env OLLAMA_MODEL

When something is uncertain, implement a clean placeholder + TODO without breaking the app. DO NOT ask me questions. Just build.

Finally: ensure geolocation is only requested after user interaction (button click).