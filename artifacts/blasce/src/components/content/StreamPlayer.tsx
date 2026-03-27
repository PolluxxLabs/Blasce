import { X, ChevronDown, RefreshCw, Tv, Zap, Download, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { DownloadModal } from "./DownloadModal";
import { DirectPlayer } from "./DirectPlayer";
import { useDirectSources } from "@/hooks/useDirectSources";

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
  const embedSources = EMBED_SOURCES.filter(s => s.available(params));

  const [activeSource, setActiveSource] = useState<string>("vidlink");
  const [iframeKey, setIframeKey] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: directData, isLoading: directLoading } = useDirectSources(
    title,
    season,
    episode,
    true,
  );

  const hasDirectSources = !!(directData?.sources?.length);
  const isDirectMode = activeSource === "direct";

  const currentEmbed = embedSources.find(s => s.id === activeSource) ?? embedSources[0];
  const iframeUrl = currentEmbed?.getUrl(params) ?? "";

  const episodeLabel =
    type === "tv" && season != null && episode != null
      ? ` · S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`
      : "";

  const allLabels = [
    {
      id: "direct",
      label: "Direct",
      badge: hasDirectSources ? "HD" : directLoading ? "..." : undefined,
    },
    ...embedSources.map(s => ({ id: s.id, label: s.label, badge: s.badge })),
  ];
  const currentLabel = allLabels.find(l => l.id === activeSource) ?? allLabels[0];

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

  const reload = () => setIframeKey(k => k + 1);

  function selectSource(id: string) {
    setActiveSource(id);
    setShowSources(false);
    if (id !== "direct") setIframeKey(k => k + 1);
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
          {episodeLabel && <span className="text-white/40 text-sm font-mono flex-shrink-0">{episodeLabel}</span>}
        </div>

        <div className="flex items-center gap-1">
          {/* Source switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSources(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/7 transition-colors text-xs font-medium"
            >
              {isDirectMode && directLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-primary" />
              )}
              <span className="hidden sm:inline">{currentLabel.label}</span>
              <span className="sm:hidden">Source</span>
              {currentLabel.badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  currentLabel.badge === "HD"
                    ? "bg-primary/20 text-primary"
                    : currentLabel.badge === "Best"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-white/10 text-white/40"
                }`}>
                  {currentLabel.badge}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showSources ? "rotate-180" : ""}`} />
            </button>

            {showSources && (
              <div className="absolute right-0 top-full mt-1.5 bg-[hsl(0,0%,9%)] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10 min-w-[180px]">
                {allLabels.map(src => (
                  <button
                    key={src.id}
                    onClick={() => selectSource(src.id)}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between gap-3 ${
                      src.id === activeSource
                        ? "bg-primary/12 text-primary font-bold"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{src.label}</span>
                    {src.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        src.badge === "HD"
                          ? "bg-primary/20 text-primary"
                          : src.badge === "Best"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-white/40"
                      }`}>
                        {src.id === "direct" && <Zap className="w-2.5 h-2.5" />}
                        {src.badge}
                      </span>
                    )}
                    {src.id === activeSource && !src.badge && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
                <div className="border-t border-white/6 px-4 py-2 text-white/20 text-[10px]">
                  Direct = ad-free MP4 · Sources 1–6 = embed
                </div>
              </div>
            )}
          </div>

          {/* Download button */}
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

          {!isDirectMode && (
            <button onClick={reload} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/7 transition-colors" title="Reload">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/7 transition-colors" title="Close (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Player area */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {isDirectMode ? (
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            {directLoading ? (
              <div className="flex flex-col items-center gap-4 text-white/40">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm">Searching for direct stream...</p>
              </div>
            ) : hasDirectSources ? (
              <div className="w-full max-w-5xl">
                <DirectPlayer sources={directData!.sources} title={title} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                <Zap className="w-12 h-12 text-white/15" />
                <div>
                  <p className="text-white/60 font-semibold mb-1">No direct stream available</p>
                  <p className="text-white/30 text-sm leading-relaxed">
                    The scraper service hasn't indexed this title yet. Use Source 1–6 for instant playback.
                  </p>
                </div>
                <button
                  onClick={() => selectSource("vidlink")}
                  className="px-5 py-2.5 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  Switch to Source 1
                </button>
              </div>
            )}
          </div>
        ) : (
          <iframe
            key={iframeKey}
            src={iframeUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-[hsl(0,0%,5%)] border-t border-white/5 flex items-center justify-between flex-shrink-0">
        <p className="text-white/18 text-[11px]">
          {isDirectMode
            ? hasDirectSources
              ? "Direct MP4 stream — ad-free, quality selectable from player"
              : "Switch to Source 1–6 for embed playback"
            : "Video not loading? Switch to a different source above."}
        </p>
        <p className="text-white/12 text-[11px]">Esc to close</p>
      </div>

      {showDownload && imdbId && (
        <DownloadModal
          imdbId={imdbId}
          title={title}
          onClose={() => setShowDownload(false)}
        />
      )}
    </div>
  );
}
