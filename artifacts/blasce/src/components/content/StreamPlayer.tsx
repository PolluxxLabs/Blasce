import { X, ChevronDown, RefreshCw, Tv, Zap, Download } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { DownloadModal } from "./DownloadModal";

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

const EMBED_SOURCES: Source[] = [
  {
    id: "vidlink",
    label: "Source 1",
    badge: "Best",
    available: ({ tmdbId }) => !!tmdbId,
    getUrl: ({ tmdbId, type, season, episode }) =>
      type === "tv"
        ? `https://vidlink.pro/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}?primaryColor=f5a623&autoplay=true`
        : `https://vidlink.pro/movie/${tmdbId}?primaryColor=f5a623&autoplay=true`,
  },
  {
    id: "vidsrc-to",
    label: "Source 2",
    available: ({ imdbId, tmdbId }) => !!(imdbId || tmdbId),
    getUrl: ({ imdbId, tmdbId, type, season, episode }) => {
      const id = tmdbId ?? imdbId;
      return type === "tv"
        ? `https://vidsrc.to/embed/tv/${id}/${season ?? 1}/${episode ?? 1}`
        : `https://vidsrc.to/embed/movie/${id}`;
    },
  },
  {
    id: "autoembed",
    label: "Source 3",
    available: ({ imdbId }) => !!imdbId,
    getUrl: ({ imdbId, type, season, episode }) =>
      type === "tv"
        ? `https://player.autoembed.cc/embed/tv/${imdbId}/${season ?? 1}/${episode ?? 1}`
        : `https://player.autoembed.cc/embed/movie/${imdbId}`,
  },
  {
    id: "smashy",
    label: "Source 4",
    available: ({ imdbId }) => !!imdbId,
    getUrl: ({ imdbId, type, season, episode }) =>
      type === "tv"
        ? `https://player.smashy.stream/tv/${imdbId}?s=${season ?? 1}&e=${episode ?? 1}`
        : `https://player.smashy.stream/movie/${imdbId}`,
  },
  {
    id: "2embed",
    label: "Source 5",
    available: ({ imdbId }) => !!imdbId,
    getUrl: ({ imdbId, type, season, episode }) =>
      type === "tv"
        ? `https://www.2embed.cc/embedtv/${imdbId}&s=${season ?? 1}&e=${episode ?? 1}`
        : `https://www.2embed.cc/embed/${imdbId}`,
  },
  {
    id: "vidsrc-me",
    label: "Source 6",
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
  const sources = EMBED_SOURCES.filter(s => s.available(params));

  const [activeId, setActiveId] = useState<string>(sources[0]?.id ?? "vidlink");
  const [iframeKey, setIframeKey] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = sources.find(s => s.id === activeId) ?? sources[0];
  const iframeUrl = current?.getUrl(params) ?? "";

  const episodeLabel =
    type === "tv" && season != null && episode != null
      ? ` · S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`
      : "";

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowSources(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function selectSource(id: string) {
    setActiveId(id);
    setShowSources(false);
    setIframeKey(k => k + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-sm flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 border-b border-white/8 bg-[hsl(0,0%,5%)]">
        <div className="flex items-center gap-2.5 min-w-0">
          {type === "tv" && <Tv className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          <span className="text-white font-semibold text-sm truncate max-w-[32vw]">{title}</span>
          {episodeLabel && (
            <span className="text-white/40 text-sm font-mono flex-shrink-0">{episodeLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Source switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSources(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/7 transition-colors text-xs font-medium"
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{current?.label ?? "Source"}</span>
              <span className="sm:hidden">Source</span>
              {current?.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                  {current.badge}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showSources ? "rotate-180" : ""}`} />
            </button>

            {showSources && (
              <div className="absolute right-0 top-full mt-1.5 bg-[hsl(0,0%,9%)] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 min-w-[160px]">
                {sources.map(src => (
                  <button
                    key={src.id}
                    onClick={() => selectSource(src.id)}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between gap-3 ${
                      src.id === activeId
                        ? "bg-primary/12 text-primary font-bold"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{src.label}</span>
                    {src.badge ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                        {src.badge}
                      </span>
                    ) : src.id === activeId ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    ) : null}
                  </button>
                ))}
                <div className="border-t border-white/6 px-4 py-2 text-white/20 text-[10px]">
                  If one source fails, try another
                </div>
              </div>
            )}
          </div>

          {/* Download */}
          {type === "movie" && imdbId && (
            <button
              onClick={() => setShowDownload(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/50 hover:text-primary hover:bg-primary/8 transition-colors text-xs font-medium"
              title="Download"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}

          {/* Reload */}
          <button
            onClick={() => setIframeKey(k => k + 1)}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/7 transition-colors"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/7 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <iframe
          key={iframeKey}
          src={iframeUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-[hsl(0,0%,5%)] border-t border-white/5 flex items-center justify-between flex-shrink-0">
        <p className="text-white/18 text-[11px]">Video not loading? Switch to a different source above.</p>
        <p className="text-white/12 text-[11px]">Esc to close</p>
      </div>

      {showDownload && imdbId && (
        <DownloadModal imdbId={imdbId} title={title} onClose={() => setShowDownload(false)} />
      )}
    </div>
  );
}
