import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, X } from "lucide-react";
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync type from URL if it changes
  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search);
    const newType = currentParams.get("type") as ListContentType | null;
    if (newType !== type) {
      setType(newType || undefined);
      setGenre(undefined); // Reset genre on type change
    }
  }, [location]);

  const { data: genresData } = useListGenres();
  const { data: contentData, isLoading } = useListContent({
    type,
    genre,
    search: debouncedSearch || undefined,
    limit: 48,
  });

  const pageTitle = search ? `Search: ${search}` : type === 'movie' ? 'Movies' : type === 'tv' ? 'TV Shows' : 'All Content';

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-4 md:px-8 max-w-[1600px] mx-auto">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-2">{pageTitle}</h1>
          <p className="text-white/50 text-lg">
            {contentData?.total ? `${contentData.total} titles found` : 'Discover your next favorite'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search titles, actors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 lg:w-80 bg-secondary/50 border border-white/10 rounded-full py-3 pl-12 pr-10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-secondary transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <button 
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-full font-semibold transition-colors border",
              isFiltersOpen || genre || type 
                ? "bg-primary text-white border-primary" 
                : "bg-secondary/50 text-white border-white/10 hover:bg-secondary"
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="hidden md:inline">Filters</span>
          </button>
        </div>
      </div>

      {/* Filter Drawer */}
      {isFiltersOpen && (
        <div className="bg-secondary/30 border border-white/5 rounded-2xl p-6 mb-12 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Content Type</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setType(undefined)}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors border", !type ? "bg-white text-black border-white" : "bg-transparent text-white/70 border-white/10 hover:border-white/30")}
                >
                  All
                </button>
                <button
                  onClick={() => setType('movie')}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors border", type === 'movie' ? "bg-white text-black border-white" : "bg-transparent text-white/70 border-white/10 hover:border-white/30")}
                >
                  Movies
                </button>
                <button
                  onClick={() => setType('tv')}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors border", type === 'tv' ? "bg-white text-black border-white" : "bg-transparent text-white/70 border-white/10 hover:border-white/30")}
                >
                  TV Shows
                </button>
              </div>
            </div>

            {genresData?.genres && (
              <div>
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGenre(undefined)}
                    className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border", !genre ? "bg-primary text-white border-primary" : "bg-transparent text-white/70 border-white/10 hover:border-white/30")}
                  >
                    All
                  </button>
                  {genresData.genres.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGenre(g.slug)}
                      className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border", genre === g.slug ? "bg-primary text-white border-primary" : "bg-transparent text-white/70 border-white/10 hover:border-white/30")}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Grid */}
      {isLoading ? (
        <LoadingSpinner className="py-32" />
      ) : contentData?.items && contentData.items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {contentData.items.map((item, index) => (
            <ContentCard key={item.id} content={item} index={index % 12} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <img 
            src={`${import.meta.env.BASE_URL}images/empty-state.png`} 
            alt="No content found" 
            className="w-64 h-64 mb-6 opacity-80 mix-blend-screen"
          />
          <h3 className="text-2xl font-display font-bold text-white mb-2">No results found</h3>
          <p className="text-white/50 max-w-md">
            We couldn't find any content matching your current filters. Try adjusting your search or category.
          </p>
          <button 
            onClick={() => { setSearch(""); setType(undefined); setGenre(undefined); }}
            className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
