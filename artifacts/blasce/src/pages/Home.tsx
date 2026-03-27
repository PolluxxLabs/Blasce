import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Play, Info, Star, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  useGetTopRated,
  useGetNewReleases,
  useListContent,
} from "@workspace/api-client-react";
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { TmdbCarousel } from "@/components/content/TmdbCarousel";
import { SkeletonCarouselRow } from "@/components/ui/SkeletonCard";
import { getTrending, tmdbBackdrop, type TMDBTrendingItem } from "@/lib/tmdb";

// ── Genre Row ──────────────────────────────────────────────────────────
function GenreRow({ genreSlug, genreName }: { genreSlug: string; genreName: string }) {
  const { data, isLoading } = useListContent({ genre: genreSlug, limit: 12 });
  if (isLoading) return <SkeletonCarouselRow />;
  if (!data?.items?.length) return null;
  return <ContentCarousel title={genreName} items={data.items} viewAllHref={`/browse?genre=${genreSlug}`} />;
}

// ── TMDB Hero Slide (backdrop) ──────────────────────────────────────────
function TmdbHeroSlide({ item }: { item: TMDBTrendingItem }) {
  const backdrop = tmdbBackdrop(item.backdrop_path) || `${import.meta.env.BASE_URL}images/hero-bg.png`;
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="absolute inset-0"
    >
      <img src={backdrop} alt={item.title || item.name} className="absolute inset-0 w-full h-full object-cover scale-105" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
    </motion.div>
  );
}

// ── TMDB Hero Content ────────────────────────────────────────────────────
function TmdbHeroContent({ item }: { item: TMDBTrendingItem }) {
  const title = item.title || item.name || "";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const href = item.media_type === "tv" ? `/watch/tv/${item.id}` : `/watch/movie/${item.id}`;

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="max-w-2xl"
    >
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {item.media_type === "tv" ? (
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md">
            TV Series
          </span>
        ) : (
          <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md">
            Movie
          </span>
        )}
        {year && <span className="text-white/50 text-sm font-medium">{year}</span>}
      </div>

      <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-tight mb-4 text-balance drop-shadow-2xl">
        {title}
      </h1>

      {/* Score & metadata */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {(item.vote_average ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-lg backdrop-blur-md border border-yellow-500/20">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-sm">{item.vote_average!.toFixed(1)}</span>
            <span className="text-white/40 text-xs">TMDB</span>
          </div>
        )}
      </div>

      {item.overview && (
        <p className="text-base md:text-lg text-white/65 mb-8 line-clamp-2 leading-relaxed max-w-xl">
          {item.overview}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={href}
          className="flex items-center gap-2.5 px-7 py-3.5 bg-white text-black rounded-xl font-bold text-base hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.25)]"
        >
          <Play className="w-5 h-5 fill-current" />
          Play Now
        </Link>
        <Link
          href={href}
          className="flex items-center gap-2 px-5 py-3.5 bg-white/10 hover:bg-white/18 text-white rounded-xl font-semibold backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 text-base"
        >
          <Info className="w-5 h-5" />
          More Info
        </Link>
      </div>
    </motion.div>
  );
}

// ── TMDB Hero Carousel ───────────────────────────────────────────────────
function TmdbHeroCarousel({ items }: { items: TMDBTrendingItem[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const SLIDE_DURATION = 9000;

  const advance = useCallback(() => setActiveIdx(i => (i + 1) % items.length), [items.length]);
  const prev = useCallback(() => setActiveIdx(i => (i - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const t = setInterval(advance, SLIDE_DURATION);
    return () => clearInterval(t);
  }, [paused, advance, items.length]);

  const active = items[activeIdx];

  return (
    <section
      className="relative h-[88vh] min-h-[620px] w-full flex items-center overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence>
        <TmdbHeroSlide key={active.id} item={active} />
      </AnimatePresence>

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 w-full mt-20">
        <AnimatePresence mode="wait">
          <TmdbHeroContent key={active.id} item={active} />
        </AnimatePresence>
      </div>

      {/* Indicators + nav */}
      <div className="absolute bottom-28 left-0 w-full z-20 pointer-events-none">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 pointer-events-auto">
            {items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setActiveIdx(i)}
                aria-label={`Go to ${item.title || item.name}`}
                className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
                style={{ width: i === activeIdx ? 32 : 12, background: i === activeIdx ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)" }}
              >
                {i === activeIdx && !paused && (
                  <motion.div
                    key={activeIdx}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
                    className="absolute inset-0 bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button onClick={prev} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all hover:scale-110">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={advance} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all hover:scale-110">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function Home() {
  const { data: tmdbTrending, isLoading: trendingLoading } = useQuery({
    queryKey: ["tmdb-trending", "week"],
    queryFn: () => getTrending("week"),
    staleTime: 30 * 60 * 1000,
  });

  const { data: topRated } = useGetTopRated({ limit: 12 });
  const { data: newReleases } = useGetNewReleases({ limit: 12 });

  // Hero items: first 6 TMDB trending items that have a backdrop
  const heroItems = (tmdbTrending ?? []).filter(i => i.backdrop_path).slice(0, 6);
  // Carousel: all 20 results
  const trendingItems = tmdbTrending ?? [];

  if (trendingLoading || heroItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-[88vh] bg-secondary/20 animate-pulse" />
        <div className="space-y-12 py-12">
          <SkeletonCarouselRow />
          <SkeletonCarouselRow />
          <SkeletonCarouselRow />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TmdbHeroCarousel items={heroItems} />

      {/* ── Content Rows ── */}
      <div className="relative z-20 -mt-24 space-y-10 md:space-y-14">
        {trendingItems.length > 0 && (
          <TmdbCarousel title="Trending Now" items={trendingItems} />
        )}

        {(topRated?.items?.length ?? 0) > 0 && (
          <section>
            <div className="px-4 md:px-8 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Highest Rated</span>
            </div>
            <ContentCarousel title="Top Rated" items={topRated!.items} viewAllHref="/browse?sort=rating" />
          </section>
        )}

        {(newReleases?.items?.length ?? 0) > 0 && (
          <ContentCarousel title="New Releases" items={newReleases!.items} viewAllHref="/browse?sort=newest" />
        )}

        {/* Genre rows */}
        <GenreRow genreSlug="drama" genreName="Drama" />
        <GenreRow genreSlug="crime" genreName="Crime & Thriller" />
        <GenreRow genreSlug="sci-fi" genreName="Sci-Fi" />
        <GenreRow genreSlug="comedy" genreName="Comedy" />
        <GenreRow genreSlug="action" genreName="Action & Adventure" />
        <GenreRow genreSlug="fantasy" genreName="Fantasy & Epic" />
        <GenreRow genreSlug="horror" genreName="Horror & Suspense" />
        <GenreRow genreSlug="animation" genreName="Animation" />
      </div>
    </div>
  );
}
