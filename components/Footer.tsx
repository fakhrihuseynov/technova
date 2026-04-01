import { Github, Linkedin, MapPin, Sparkles, Zap } from "lucide-react";

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white mt-auto">
      {/* Main grid */}
      <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          <img src="/logo.svg" alt="TechNova" className="h-9 w-auto" />
          <p className="text-sm text-gray-500 leading-relaxed">
            Discover tech events happening near you — summarised and curated by
            AI, personalised to your location in seconds.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered summaries
          </div>
        </div>

        {/* Product */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Product
          </h4>
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            <li>
              <a href="/" className="hover:text-green-600 transition-colors">
                Home
              </a>
            </li>
            <li>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                Location-aware search
              </span>
            </li>
            <li>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-gray-400" />
                Real-time event data
              </span>
            </li>
          </ul>
        </div>

        {/* Data sources */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Data &amp; AI
          </h4>
          <ul className="flex flex-col gap-2 text-sm text-gray-600">
            <li>
              <a
                href="https://confs.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-600 transition-colors"
              >
                confs.tech — event data
              </a>
            </li>
            <li>
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-600 transition-colors"
              >
                Ollama — local AI summaries
              </a>
            </li>
            <li>
              <a
                href="https://nominatim.openstreetmap.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-600 transition-colors"
              >
                Nominatim — geocoding
              </a>
            </li>
          </ul>
        </div>

        {/* Founder */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Built by
          </h4>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-gray-800">Fakhri Huseynov</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Software engineer &amp; technology enthusiast.
              Passionate about building products that connect people with
              knowledge.
            </p>
            <div className="flex items-center gap-3 mt-1">
              <a
                href="https://github.com/fakhrihuseynov"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-gray-400 hover:text-gray-800 transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com/in/fakhrihuseynov"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>

            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>
            © {YEAR} TechNova. All rights reserved. Built by{" "}
            <a
              href="https://github.com/fakhrihuseynov"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Fakhri Huseynov
            </a>
            .
          </span>
          <a
            href="https://github.com/fakhrihuseynov/technova"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors font-medium"
          >
            <Github className="w-3.5 h-3.5" />
            fakhrihuseynov/technova
          </a>
        </div>
      </div>
    </footer>
  );
}
