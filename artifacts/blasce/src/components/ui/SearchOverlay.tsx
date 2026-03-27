import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, X, Star, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { SkeletonCard } from "./SkeletonCard";
import { searchTmdb, getTrending, tmdbPoster, type TMDBSearchResult, type TMDBTrendingItem } from "@/lib/tmdb";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

function getItemRoute(item: TMDBSearchResult | TMDBTrendingItem): string {
  return item.media_type === "tv"
    ? `/watch/tv/${item.id}`
    : `/watch/movie/${item.id}`;
}

function getItemTitle(item: TMDBSearchResult | TMDBTrendingItem): string {
  return (item as any).title ?? (item as any).name ?? "Untitled";
}

function getItemYear(item: TMDBSearchResult | TMDBTrendingItem): string {
  const date = (item as any).release_date ?? (item as any).first_air_date ?? "";
  return date.slice(0, 4);
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery("");
      setDebounced("");
      setFocusedIdx(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 320);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { setFocusedIdx(-1); }, [debounced]);

  const isSearching = debounced.length >= 2;

  const { data: tmdbResults, isLoading: searchLoading } = useQuery<TMDBSearchResult[]>({
    queryKey: ["tmdb-search", debounced],
    queryFn: () => searchTmdb(debounced),
    enabled: isSearching,
    staleTime: 2 * 60 * 1000,
  });

  const { data: trendingItems } = useQuery<TMDBTrendingItem[]>({
    queryKey: ["tmdb-trending-search", "week"],
    queryFn: () => getTrending("week"),
    staleTime: 30 * 60 * 1000,
  });

  const displayItems = isSearching ? (tmdbResults ?? []) : [];
  const trendingDisplay = (trendingItems ?? []).slice(0, 8);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (!displayItems.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx(i => {
        const next = Math.min(i + 1, displayItems.length - 1);
        resultRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx(i => {
        if (i <= 0) { inputRef.current?.focus(); return -1; }
        const prev = i - 1;
        resultRefs.current[prev]?.scrollIntoView({ block: "nearest" });
        return prev;
      });
    } else if (e.key === "Enter" && focusedIdx >= 0) {
      e.preventDefault();
      const item = displayItems[focusedIdx];
      if (item) { navigate(getItemRoute(item)); onClose(); }
    }
  }, [displayItems, focusedIdx, navigate, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-2xl"
            onClick={onClose}
          />

          <motion.div
            key="search-panel"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-x-0 top-0 z-[201] flex flex-col max-h-screen"
          >
            {/* Search input bar */}
            <div className="flex items-center gap-3 px-4 md:px-8 py-4 border-b border-white/8 bg-[hsl(0,0%,7%)]/98">
              <Search className="w-5 h-5 text-primary flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search any movie or TV show..."
                className="flex-1 bg-transparent text-white text-lg placeholder:text-white/20 focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-white/35 hover:text-white transition-colors">
                  <X className="w-4.5 h-4.5" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1.5 text-white/25 text-xs">
                <kbd className="bg-white/6 border border-white/8 px-1.5 py-0.5 rounded text-[11px] font-mono">↑↓</kbd>
                <kbd className="bg-white/6 border border-white/8 px-1.5 py-0.5 rounded text-[11px] font-mono">↵</kbd>
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/6 hover:bg-white/10 text-white/50 hover:text-white rounded-lg text-xs font-medium transition-all border border-white/6"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div className="overflow-y-auto flex-1 px-4 md:px-8 py-6 bg-[hsl(0,0%,6%)]/96" onClick={e => e.stopPropagation()}>
              {isSearching ? (
                <>
                  <p className="text-white/30 text-sm mb-5">
                    {searchLoading ? "Searching…" : `${tmdbResults?.length ?? 0} results for "${debounced}"`}
                  </p>
                  {searchLoading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
                      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                  ) : tmdbResults?.length ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
                      {tmdbResults.map((item, idx) => {
                        const poster = tmdbPoster(item.poster_path);
                        const title = getItemTitle(item);
                        const year = getItemYear(item);
                        const route = getItemRoute(item);
                        return (
                          <a
                            key={`${item.media_type}-${item.id}`}
                            ref={el => { resultRefs.current[idx] = el; }}
                            href={route}
                            onClick={e => { e.preventDefault(); navigate(route); onClose(); }}
                            className={`group block rounded-xl overflow-hidden bg-secondary transition-all outline-none ${
                              focusedIdx === idx
                                ? "ring-2 ring-primary scale-[1.03]"
                                : "hover:ring-2 hover:ring-primary/40 hover:scale-[1.02]"
                            }`}
                          >
                            <div className="aspect-[2/3] relative">
                              {poster ? (
                                <img src={poster} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <div className="w-full h-full bg-secondary/80 flex items-center justify-center p-2 text-center text-white/25 text-xs">{title}</div>
                              )}
                              <div className="absolute top-1.5 left-1.5">
                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                                  item.media_type === "tv" ? "bg-accent/80 text-white" : "bg-primary/80 text-black"
                                }`}>
                                  {item.media_type === "tv" ? "TV" : "Film"}
                                </span>
                              </div>
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2.5 pt-8">
                                <p className="text-white text-xs font-semibold line-clamp-1">{title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {year && <span className="text-white/35 text-[10px]">{year}</span>}
                                  {(item.vote_average ?? 0) > 0 && (
                                    <p className="text-primary text-[10px] flex items-center gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      {item.vote_average!.toFixed(1)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-white/30 text-lg font-display font-bold">No results for "{debounced}"</p>
                      <p className="text-white/20 text-sm mt-2">Try a different search term</p>
                    </div>
                  )}
                </>
              ) : (
                /* Trending when idle */
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <Flame className="w-4 h-4 text-primary" />
                    <span className="text-white/40 text-xs font-semibold uppercase tracking-widest">Trending This Week</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
                    {trendingDisplay.map((item, idx) => {
                      const poster = tmdbPoster(item.poster_path);
                      const title = getItemTitle(item);
                      const route = getItemRoute(item);
                      return (
                        <a
                          key={`${item.media_type}-${item.id}`}
                          ref={el => { resultRefs.current[idx] = el; }}
                          href={route}
                          onClick={e => { e.preventDefault(); navigate(route); onClose(); }}
                          className={`group block rounded-xl overflow-hidden bg-secondary transition-all outline-none ${
                            focusedIdx === idx
                              ? "ring-2 ring-primary scale-[1.03]"
                              : "hover:ring-2 hover:ring-primary/40 hover:scale-[1.02]"
                          }`}
                        >
                          <div className="aspect-[2/3] relative">
                            {poster ? (
                              <img src={poster} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full bg-secondary/80 flex items-center justify-center p-2 text-center text-white/25 text-xs">{title}</div>
                            )}
                            <div className="absolute top-1.5 left-1.5">
                              <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded text-primary font-mono">{idx + 1}</span>
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/88 to-transparent p-2 pt-8">
                              <p className="text-white text-[11px] font-semibold line-clamp-1">{title}</p>
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
