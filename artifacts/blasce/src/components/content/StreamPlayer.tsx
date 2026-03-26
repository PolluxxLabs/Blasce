import { X, ChevronDown, RefreshCw, Tv } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface SourceParams {
  imdbId: string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}

interface Source {
  id: string;
  label: string;
  getUrl: (params: SourceParams) => string;
}

const API_BASE = "/api";

const SOURCES: Source[] = [
  {
    id: "proxy",
    label: "Source 1",
    getUrl: ({ imdbId, type, season, episode }) => {
      const base = `${API_BASE}/stream-proxy?imdb=${imdbId}&type=${type}`;
      return type === "tv"
        ? `${base}&s=${season ?? 1}&e=${episode ?? 1}`
        : base;
    },
  },
  {
    id: "2embed",
    label: "Source 2",
    getUrl: ({ imdbId, type, season, episode }) =>
      type === "tv"
        ? `https://www.2embed.cc/embedtv/${imdbId}&s=${season ?? 1}&e=${episode ?? 1}`
        : `https://www.2embed.cc/embed/${imdbId}`,
  },
  {
    id: "vidsrc-me",
    label: "Source 3",
    getUrl: ({ imdbId, type, season, episode }) =>
      type === "tv"
        ? `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season ?? 1}&episode=${episode ?? 1}`
        : `https://vidsrc.me/embed/movie?imdb=${imdbId}`,
  },
];

interface StreamPlayerProps {
  imdbId: string;
  title: string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  onClose: () => void;
}

export function StreamPlayer({ imdbId, title, type, season, episode, onClose }: StreamPlayerProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const [key, setKey] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSource = SOURCES[sourceIndex];
  const embedUrl = currentSource.getUrl({ imdbId, type, season, episode });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSources(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchSource = (idx: number) => {
    setSourceIndex(idx);
    setKey(k => k + 1);
    setShowSources(false);
  };

  const reload = () => setKey(k => k + 1);

  const episodeLabel =
    type === "tv" && season != null && episode != null
      ? ` · S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`
      : "";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-sm flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/8 bg-black/60">
        <div className="flex items-center gap-3 min-w-0">
          {type === "tv" && <Tv className="w-4 h-4 text-primary flex-shrink-0" />}
          <span className="text-white font-semibold text-sm truncate max-w-[40vw]">{title}</span>
          {episodeLabel && (
            <span className="text-white/45 text-sm font-mono flex-shrink-0">{episodeLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Source switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSources(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/55 hover:text-white hover:bg-white/8 transition-colors text-xs font-medium"
            >
              {currentSource.label}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${showSources ? "rotate-180" : ""}`}
              />
            </button>
            {showSources && (
              <div className="absolute right-0 top-full mt-1.5 bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 min-w-[130px]">
                {SOURCES.map((src, idx) => (
                  <button
                    key={src.id}
                    onClick={() => switchSource(idx)}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                      idx === sourceIndex
                        ? "bg-primary/15 text-primary font-bold"
                        : "text-white/65 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    {src.id === "proxy" ? `${src.label} ✦` : src.label}
                  </button>
                ))}
                <div className="border-t border-white/8 px-4 py-2.5">
                  <p className="text-white/30 text-[10px] leading-tight">
                    Source 1 is ad-free
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={reload}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 relative bg-black">
        <iframe
          key={key}
          src={embedUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-black/60 border-t border-white/5 flex items-center justify-between">
        <p className="text-white/20 text-[11px]">
          Source 1 is ad-free · Switch source if one fails
        </p>
        <p className="text-white/15 text-[11px]">Esc to close</p>
      </div>
    </div>
  );
}
