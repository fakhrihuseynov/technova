# TechNova 🌍⚡️
A responsive “tech events news” web app that detects your location, fetches the latest technology events near you (or any city you choose), and uses a local Ollama model to summarize who each event is best for.

## ✨ What TechNova Does
- Detects user location (browser geolocation) and loads nearby tech events.
- Lets you switch location manually (e.g., **Tbilisi, Georgia**) and view events for the current month.
- Shows each event with:
  - Name, date/time
  - Venue address (when available)
  - Contact/organizer info (when available)
  - Official event webpage link(s)
  - Social links (if discoverable / provided by the data source)
- Uses **Ollama AI** to:
  - Produce a short event summary
  - Suggest the best audience (e.g., DevOps, Backend, Data, Students, Founders)
  - Extract key tags/topics
- UI: responsive, clean, green/white/light-gray theme, “news feed” style with infinite scroll and event cards.

## 🧱 Tech Stack (Recommended)
- **Next.js (App Router) + TypeScript**
- **TailwindCSS** for responsive UI
- **Ollama** local AI via:
  - Official REST API `POST /api/chat` (Ollama) [1](https://docs.ollama.com/api/chat)[2](https://ollama.readthedocs.io/en/api/)
  - OR `ollama` JavaScript library (`npm i ollama`) [3](https://github.com/ollama/ollama-js)[4](https://www.npmjs.com/ollama)[5](https://ollama.com/blog/python-javascript-libraries)
- Event data provider (starter):
  - **Ticketmaster Discovery API** (search by `latlong` and `apikey`) [6](https://developer.ticketmaster.com/products-and-docs/tutorials/events-search/search_events_in_location.html)[7](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)

> Note: Browser geolocation requires a **secure context (HTTPS)** in production. [8](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)

## 🗺️ Data Sources
### Ticketmaster Discovery API (starter provider)
- You pass `apikey` in the query string. [7](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
- You can search events near coordinates using `latlong`. [6](https://developer.ticketmaster.com/products-and-docs/tutorials/events-search/search_events_in_location.html)

We implement a clean provider interface so later you can add more sources (Meetup, local communities, custom scrapers, etc.).

## 🔐 Privacy & Security
- Location is requested only after user consent.
- Store only minimal user preference (like last city) in localStorage.
- Do not store precise GPS coordinates server-side unless you intentionally enable it.

## ✅ Requirements
- Node.js 18+ (recommended 20+)
- Ollama installed and running locally (default host: `http://localhost:11434`)
- Ticketmaster API key (free on their developer portal)

## ⚙️ Environment Variables
Create `.env.local`:

```bash
# Event Provider
TICKETMASTER_API_KEY=YOUR_KEY_HERE

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.1

# App
NEXT_PUBLIC_APP_NAME=TechNova
``