import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useListContent, useListGenres, type ListContentType, type ListContentSort } from "@workspace/api-client-react";
import { ContentCard } from "@/components/content/ContentCard";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";
import { cn } from "@/lib/utils";

export default function Browse() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialType = searchParams.get("type") as ListContentType | null;
  const initialGenre = searchParams.get("genre") ?? undefined;
  const initialSort = (searchParams.get("sort") as ListContentSort) || undefined;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<ListContentType | undefined>(initialType || undefined);
  const [genre, setGenre] = useState<string | undefined>(initialGenre);
  const [sort, setSort] = useState<ListContentSort | undefined>(initialSort);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setType((p.get("type") as ListContentType) || undefined);
    setGenre(p.get("genre") ?? undefined);
    setSort((p.get("sort") as ListContentSort) || undefined);
  }, [location]);

  const { data: genresData } = useListGenres();
  const { data: contentData, isLoading } = useListContent({
    type,
    genre,
    search: debouncedSearch || undefined,
    sort,
    limit: 60,
  });

  const hasFilters = !!(type || genre || search);
  const pageTitle = type === "movie" ? "Movies" : type === "tv" ? "TV Shows" : "Browse";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky filter bar */}
      <div className="sticky top-[57px] z-40 bg-background/94 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex items-center gap-3 py-3.5">
            {/* Type tabs */}
            <div className="flex items-center gap-0.5 bg-white/4 rounded-lg p-0.5 border border-white/6 flex-shrink-0">
              {(["all", "movie", "tv"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setType(t === "all" ? undefined : t); setGenre(undefined); }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-md text-sm font-medium transition-all",
                    (t === "all" && !type) || type === t
                      ? "bg-primary text-black shadow font-semibold"
                      : "text-white/45 hover:text-white"
                  )}
                >
                  {t === "all" ? "All" : t === "movie" ? "Movies" : "TV"}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative group flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search titles..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/4 border border-white/6 rounded-lg py-2 pl-9 pr-8 text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 focus:bg-white/6 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="relative flex items-center gap-2 flex-shrink-0 ml-auto">
              <SlidersHorizontal className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
              <select
                value={sort ?? ""}
                onChange={e => setSort((e.target.value as ListContentSort) || undefined)}
                className="appearance-none bg-white/4 border border-white/6 rounded-lg py-2 pl-2.5 pr-6 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 cursor-pointer"
              >
                <option value="">Relevance</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="rating">Top Rated</option>
                <option value="title">A–Z</option>
              </select>
            </div>
          </div>

          {/* Genre chips */}
          {genresData?.genres && (
            <div className="flex gap-1.5 pb-3.5 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setGenre(undefined)}
                className={cn(
                  "flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border",
                  !genre
                    ? "bg-primary text-black border-primary font-semibold"
                    : "bg-transparent text-white/40 border-white/8 hover:border-white/20 hover:text-white/70"
                )}
              >
                All genres
              </button>
              {genresData.genres.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGenre(genre === g.slug ? undefined : g.slug)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all border",
                    genre === g.slug
                      ? "bg-primary text-black border-primary font-semibold"
                      : "bg-transparent text-white/40 border-white/8 hover:border-white/20 hover:text-white/70"
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-8">
        <div className="flex items-baseline justify-between mb-7">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white">
            {debouncedSearch ? `"${debouncedSearch}"` : pageTitle}
          </h1>
          {contentData?.total != null && (
            <span className="text-white/30 text-sm">{contentData.total} titles</span>
          )}
        </div>

        {isLoading ? (
          <SkeletonGrid count={18} />
        ) : contentData?.items && contentData.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {contentData.items.map((item, index) => (
              <ContentCard key={item.id} content={item} index={index % 18} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full bg-white/4 flex items-center justify-center mb-6 border border-white/6">
              <Search className="w-6 h-6 text-white/20" />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">No results found</h3>
            <p className="text-white/35 max-w-xs text-sm leading-relaxed">
              Try a different genre, type, or search term.
            </p>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setType(undefined); setGenre(undefined); }}
                className="mt-6 px-5 py-2 bg-white/6 hover:bg-white/10 text-white rounded-lg font-medium text-sm transition-colors border border-white/8"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
