import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, X, Star, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useListContent, useGetTrending } from "@workspace/api-client-react";
import type { Content } from "@workspace/api-client-react";
import { SkeletonCard } from "./SkeletonCard";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
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
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setDebounced("");
      setFocusedIdx(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Reset focused index whenever results change
  useEffect(() => {
    setFocusedIdx(-1);
  }, [debounced]);

  const isSearching = debounced.length >= 2;
  const { data: results, isLoading: searchLoading } = useListContent(
    { search: debounced, limit: 12 },
    { query: { enabled: isSearching } }
  );
  const { data: trending } = useGetTrending({ limit: 8 });

  const displayItems = isSearching ? (results?.items ?? []) : (trending?.items ?? []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
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
        if (i <= 0) {
          inputRef.current?.focus();
          return -1;
        }
        const prev = i - 1;
        resultRefs.current[prev]?.scrollIntoView({ block: "nearest" });
        return prev;
      });
    } else if (e.key === "Enter" && focusedIdx >= 0) {
      e.preventDefault();
      const item = displayItems[focusedIdx];
      if (item) {
        navigate(`/content/${item.id}`);
        onClose();
      }
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
          {/* Backdrop */}
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-2xl"
            onClick={onClose}
          />

          {/* Overlay content */}
          <motion.div
            key="search-panel"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-0 top-0 z-[201] flex flex-col max-h-screen"
          >
            {/* Search bar */}
            <div className="flex items-center gap-4 px-4 md:px-8 py-5 border-b border-white/8">
              <Search className="w-5 h-5 text-white/40 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search movies, TV shows, actors..."
                className="flex-1 bg-transparent text-white text-xl placeholder:text-white/25 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1.5 text-white/30 text-xs">
                <kbd className="bg-white/8 border border-white/10 px-1.5 py-0.5 rounded text-[11px]">↑↓</kbd>
                <span>navigate</span>
                <kbd className="bg-white/8 border border-white/10 px-1.5 py-0.5 rounded text-[11px]">↵</kbd>
                <span>open</span>
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 hover:bg-white/15 text-white/60 hover:text-white rounded-lg text-sm font-medium transition-colors border border-white/8"
              >
                <span>Close</span>
                <kbd className="text-[10px] bg-white/10 px-1 rounded">ESC</kbd>
              </button>
            </div>

            {/* Results area */}
            <div className="overflow-y-auto flex-1 px-4 md:px-8 py-6" onClick={e => e.stopPropagation()}>
              {isSearching ? (
                <>
                  <p className="text-white/35 text-sm mb-5">
                    {searchLoading
                      ? "Searching..."
                      : `${results?.total ?? 0} result${results?.total !== 1 ? "s" : ""} for "${debounced}"`}
                  </p>
                  {searchLoading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
                      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                  ) : results?.items?.length ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
                      {results.items.map((item: Content, idx: number) => (
                        <a
                          key={item.id}
                          ref={el => { resultRefs.current[idx] = el; }}
                          href={`/content/${item.id}`}
                          onClick={e => { e.preventDefault(); navigate(`/content/${item.id}`); onClose(); }}
                          className={`group block rounded-xl overflow-hidden transition-all outline-none ${
                            focusedIdx === idx
                              ? "ring-2 ring-primary scale-[1.03]"
                              : "bg-secondary hover:ring-2 hover:ring-primary/50"
                          }`}
                        >
                          <div className="aspect-[2/3] relative">
                            {item.posterUrl ? (
                              <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full bg-secondary/80 flex items-center justify-center p-2 text-center text-white/30 text-xs">{item.title}</div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2.5">
                              <p className="text-white text-xs font-semibold line-clamp-1">{item.title}</p>
                              {item.imdbScore != null && (
                                <p className="text-yellow-400 text-[10px] flex items-center gap-0.5 mt-0.5">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  {item.imdbScore.toFixed(1)}
                                </p>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-white/30 text-lg">No results found for "{debounced}"</p>
                      <p className="text-white/20 text-sm mt-2">Try a different search term</p>
                    </div>
                  )}
                </>
              ) : (
                /* Trending section when no query */
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-white/50 text-sm font-semibold uppercase tracking-wider">Trending Now</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
                    {trending?.items?.map((item: Content, idx: number) => (
                      <a
                        key={item.id}
                        ref={el => { resultRefs.current[idx] = el; }}
                        href={`/content/${item.id}`}
                        onClick={e => { e.preventDefault(); navigate(`/content/${item.id}`); onClose(); }}
                        className={`group block rounded-xl overflow-hidden transition-all outline-none ${
                          focusedIdx === idx
                            ? "ring-2 ring-primary scale-[1.03]"
                            : "bg-secondary hover:ring-2 hover:ring-primary/50"
                        }`}
                      >
                        <div className="aspect-[2/3] relative">
                          {item.posterUrl ? (
                            <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full bg-secondary/80 flex items-center justify-center p-2 text-center text-white/30 text-xs">{item.title}</div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-8">
                            <p className="text-white text-[11px] font-semibold line-clamp-1">{item.title}</p>
                          </div>
                        </div>
                      </a>
                    ))}
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
