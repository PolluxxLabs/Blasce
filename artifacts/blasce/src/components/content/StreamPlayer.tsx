import { X, ChevronDown, RefreshCw, Tv, Zap } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface SourceParams {
  imdbId?: string;
  tmdbId?: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}

interface Source {
  id: string;
  label: string;
  badge?: string;
  available: (p: SourceParams) => boolean;
  getUrl: (p: SourceParams) => string;
}

const SOURCES: Source[] = [
  {
    id: "vidlink",
    label: "Source 1",
    badge: "Best",
    available: ({ tmdbId }) => !!tmdbId,
    getUrl: ({ tmdbId, type, season, episode }) =>
      type === "tv"
        ? `https://vidlink.pro/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}?primaryColor=6C63FF&autoplay=true`
        : `https://vidlink.pro/movie/${tmdbId}?primaryColor=6C63FF&autoplay=true`,
  },
  {
    id: "vidsrc-to",
    label: "Source 1",
    badge: "Best",
    available: ({ imdbId, tmdbId }) => !!(imdbId || tmdbId),
    getUrl: ({ imdbId, tmdbId, type, season, episode }) => {
      const id = tmdbId ?? imdbId;
      return type === "tv"
        ? `https://vidsrc.to/embed/tv/${id}/${season ?? 1}/${episode ?? 1}`
        : `https://vidsrc.to/embed/movie/${id}`;
    },
  },
  {
    id: "2embed",
    label: "Source 2",
    available: ({ imdbId }) => !!imdbId,
    getUrl: ({ imdbId, type, season, episode }) =>
      type === "tv"
        ? `https://www.2embed.cc/embedtv/${imdbId}&s=${season ?? 1}&e=${episode ?? 1}`
        : `https://www.2embed.cc/embed/${imdbId}`,
  },
  {
    id: "vidsrc-me",
    label: "Source 3",
    available: ({ imdbId }) => !!imdbId,
    getUrl: ({ imdbId, type, season, episode }) =>
      type === "tv"
        ? `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season ?? 1}&episode=${episode ?? 1}`
        : `https://vidsrc.me/embed/movie?imdb=${imdbId}`,
  },
];

interface StreamPlayerProps {
  imdbId?: string;
  tmdbId?: number;
  title: string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  onClose: () => void;
}

export function StreamPlayer({ imdbId, tmdbId, title, type, season, episode, onClose }: StreamPlayerProps) {
  const params: SourceParams = { imdbId, tmdbId, type, season, episode };

  // Build the available source list
  const available = SOURCES.filter(s => s.available(params));

  // Prefer vidlink (tmdbId) → vidsrc.to (no tmdbId) for the first source
  // Deduplicate the "Source 1" slot: use vidlink if tmdbId present, else vidsrc.to
  const deduped: Source[] = [];
  const hasVidlink = available.some(s => s.id === "vidlink");
  for (const s of available) {
    if (s.id === "vidsrc-to" && hasVidlink) continue; // skip vidsrc-to if vidlink available
    deduped.push(s);
  }

  // Re-label sequentially
  let srcNum = 1;
  const sources = deduped.map(s => {
    const label = s.badge ? `Source ${srcNum}` : `Source ${srcNum}`;
    if (!s.badge) srcNum++;
    else srcNum++;
    return { ...s, label };
  });

  const [sourceIndex, setSourceIndex] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSource = sources[sourceIndex] ?? sources[0];
  const iframeUrl = currentSource?.getUrl(params) ?? "";

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = ""; };
  }, [onClose]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowSources(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const switchSource = (idx: number) => { setSourceIndex(idx); setIframeKey(k => k + 1); setShowSources(false); };
  const reload = () => setIframeKey(k => k + 1);

  const episodeLabel =
    type === "tv" && season != null && episode != null
      ? ` · S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`
      : "";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-sm flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/8 bg-black/60">
        <div className="flex items-center gap-3 min-w-0">
          {type === "tv" && <Tv className="w-4 h-4 text-primary flex-shrink-0" />}
          <span className="text-white font-semibold text-sm truncate max-w-[40vw]">{title}</span>
          {episodeLabel && <span className="text-white/45 text-sm font-mono flex-shrink-0">{episodeLabel}</span>}
        </div>

        <div className="flex items-center gap-1">
          {/* Source switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSources(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/55 hover:text-white hover:bg-white/8 transition-colors text-xs font-medium"
            >
              {currentSource?.label ?? "Source 1"}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showSources ? "rotate-180" : ""}`} />
            </button>
            {showSources && (
              <div className="absolute right-0 top-full mt-1.5 bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 min-w-[145px]">
                {sources.map((src, idx) => (
                  <button
                    key={src.id}
                    onClick={() => switchSource(idx)}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                      idx === sourceIndex
                        ? "bg-primary/15 text-primary font-bold"
                        : "text-white/65 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    <span>{src.label}</span>
                    {src.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/20 text-primary">
                        <Zap className="w-2.5 h-2.5 inline" /> {src.badge}
                      </span>
                    )}
                  </button>
                ))}
                <div className="border-t border-white/8 px-4 py-2 text-white/25 text-[10px]">
                  Switch source if video doesn't load
                </div>
              </div>
            )}
          </div>

          <button onClick={reload} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors" title="Reload">
            <RefreshCw className="w-4 h-4" />
          </button>

          <button onClick={onClose} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors" title="Close (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 relative bg-black">
        <iframe
          key={iframeKey}
          src={iframeUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="origin"
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-black/60 border-t border-white/5 flex items-center justify-between">
        <p className="text-white/20 text-[11px]">
          If video doesn't start, try a different source from the menu above
        </p>
        <p className="text-white/15 text-[11px]">Esc to close</p>
      </div>
    </div>
  );
}
