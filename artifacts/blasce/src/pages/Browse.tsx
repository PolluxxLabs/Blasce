import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, X } from "lucide-react";
import { useListContent, useListGenres, type ListContentType } from "@workspace/api-client-react";
import { ContentCard } from "@/components/content/ContentCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

export default function Browse() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialType = searchParams.get("type") as ListContentType | null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<ListContentType | undefined>(initialType || undefined);
  const [genre, setGenre] = useState<string | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("type") as ListContentType | null;
    if (t !== (type ?? null)) {
      setType(t || undefined);
      setGenre(undefined);
    }
  }, [location]);

  const { data: genresData } = useListGenres();
  const { data: contentData, isLoading } = useListContent({
    type,
    genre,
    search: debouncedSearch || undefined,
    limit: 60,
  });

  const hasFilters = !!(type || genre || search);
  const pageTitle = type === "movie" ? "Movies" : type === "tv" ? "TV Shows" : "Browse";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Sticky header bar ── */}
      <div className="sticky top-[64px] z-40 bg-background/90 backdrop-blur-xl border-b border-white/5 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          {/* Type tabs + search row */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-1 bg-white/4 rounded-xl p-1 border border-white/8">
              {(["all", "movie", "tv"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setType(t === "all" ? undefined : t); setGenre(undefined); }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    (t === "all" && !type) || type === t
                      ? "bg-white text-black shadow-md"
                      : "text-white/55 hover:text-white"
                  )}
                >
                  {t === "all" ? "All" : t === "movie" ? "Movies" : "TV Shows"}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative group flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search titles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-9 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 focus:bg-white/8 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Genre chips row */}
          {genresData?.genres && (
            <div className="flex gap-2 pb-4 overflow-x-auto hide-scrollbar -mx-1 px-1">
              <button
                onClick={() => setGenre(undefined)}
                className={cn(
                  "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border",
                  !genre ? "bg-primary text-white border-primary" : "bg-transparent text-white/50 border-white/10 hover:border-white/25 hover:text-white/80"
                )}
              >
                All genres
              </button>
              {genresData.genres.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGenre(genre === g.slug ? undefined : g.slug)}
                  className={cn(
                    "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border",
                    genre === g.slug ? "bg-primary text-white border-primary" : "bg-transparent text-white/50 border-white/10 hover:border-white/25 hover:text-white/80"
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-8">
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-black text-white">
            {debouncedSearch ? `Results for "${debouncedSearch}"` : pageTitle}
          </h1>
          {contentData?.total != null && (
            <span className="text-white/35 text-sm">
              {contentData.total} title{contentData.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner className="py-32" />
        ) : contentData?.items && contentData.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
            {contentData.items.map((item, index) => (
              <ContentCard key={item.id} content={item} index={index % 18} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Search className="w-7 h-7 text-white/20" />
            </div>
            <h3 className="text-2xl font-display font-bold text-white mb-2">No results found</h3>
            <p className="text-white/40 max-w-sm text-sm leading-relaxed">
              We couldn't find anything matching your filters. Try a different genre or search term.
            </p>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setType(undefined); setGenre(undefined); }}
                className="mt-6 px-5 py-2.5 bg-white/8 hover:bg-white/15 text-white rounded-xl font-medium text-sm transition-colors border border-white/10"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
