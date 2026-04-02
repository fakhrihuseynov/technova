"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SettingsPage() {
  const router = useRouter();
  const [models, setModels] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [location, setLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/ollama/models")
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models || []);
        setSelected(d.selected || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!selected) return;
    setSaving(true);
    await fetch("/api/ollama/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: selected }),
    });
    setSaving(false);
    // Reload so server-side picks up cookie on next requests
    window.location.reload();
  }

  function handleLocationChange(lat: number, lng: number, label: string) {
    setLocation({ lat, lng, label });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onLocationChange={handleLocationChange}
        currentLocation={location?.label}
        onHome={() => router.push("/")}
      />

      <main className="max-w-5xl mx-auto px-4 flex-1 w-full py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">← Back</Link>
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-medium">AI model selection</h2>
          <p className="text-sm text-gray-600">Choose which Ollama model your session should use. Models detected from the running Ollama instance are shown below.</p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && (
            <div className="col-span-full text-center text-gray-500">Loading models…</div>
          )}

          {!loading && models.length === 0 && (
            <div className="col-span-full text-center text-gray-500">No models detected.</div>
          )}

          {models.map((m) => {
            const isSelected = selected === m;
            return (
              <div
                key={m}
                onClick={() => setSelected(m)}
                className={`cursor-pointer p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-start gap-3 ${isSelected ? "border-green-500 ring-2 ring-green-100" : "border-gray-200"}`}
              >
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isSelected ? "border-green-600 bg-green-600 text-white" : "border-gray-300 text-gray-600"}`}>
                    {isSelected ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.071 7.071a1 1 0 01-1.414 0L3.293 9.829a1 1 0 111.414-1.414L8 11.707l6.293-6.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-sm">{m.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{m}</div>
                  <div className="text-xs text-gray-500 mt-1">Model identifier</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={save}
            disabled={!selected || saving}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save selection"}
          </button>

          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Cancel</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
