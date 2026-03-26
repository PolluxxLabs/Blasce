import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Play, Info, Star, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetTrending,
  useListContent,
  type Content,
} from "@workspace/api-client-react";
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { WatchlistButton } from "@/components/content/WatchlistButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SkeletonCarouselRow } from "@/components/ui/SkeletonCard";

// ── Genre Row ──────────────────────────────────────────────────────────
function GenreRow({ genreSlug, genreName }: { genreSlug: string; genreName: string }) {
  const { data, isLoading } = useListContent({ genre: genreSlug, limit: 12 });
  if (isLoading) return <SkeletonCarouselRow />;
  if (!data?.items?.length) return null;
  return <ContentCarousel title={genreName} items={data.items} viewAllHref={`/browse?genre=${genreSlug}`} />;
}

// ── Hero Slide ─────────────────────────────────────────────────────────
function HeroSlide({ item, isActive }: { item: Content; isActive: boolean }) {
  const backdrop = item.backdropUrl || `${import.meta.env.BASE_URL}images/hero-bg.png`;

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="absolute inset-0"
    >
      {/* Backdrop */}
      <img
        src={backdrop}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
    </motion.div>
  );
}

// ── Hero Content ───────────────────────────────────────────────────────
function HeroContent({ item }: { item: Content }) {
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
        {item.type === "tv" ? (
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md">
            TV Series
          </span>
        ) : (
          <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md">
            Film
          </span>
        )}
        {item.rating && (
          <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs font-bold backdrop-blur-md">
            {item.rating}
          </span>
        )}
        <span className="text-white/50 text-sm font-medium">{item.releaseYear}</span>
      </div>

      <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-tight mb-4 text-balance drop-shadow-2xl">
        {item.title}
      </h1>

      {/* Scores & metadata */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {item.imdbScore != null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-lg backdrop-blur-md border border-yellow-500/20">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-yellow-400 font-bold text-sm">{item.imdbScore.toFixed(1)}</span>
            <span className="text-white/40 text-xs">IMDB</span>
          </div>
        )}
        {item.rtScore != null && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-lg backdrop-blur-md border border-red-500/20">
            <span className="text-sm">🍅</span>
            <span className={`font-bold text-sm ${item.rtScore >= 60 ? "text-red-400" : "text-yellow-400"}`}>
              {item.rtScore}%
            </span>
            <span className="text-white/40 text-xs">RT</span>
          </div>
        )}
        {item.type === "tv" && item.seasons != null && (
          <span className="text-white/50 text-sm">
            {item.seasons} Season{item.seasons !== 1 ? "s" : ""}
            {item.totalEpisodes ? ` · ${item.totalEpisodes} eps` : ""}
          </span>
        )}
        {item.type === "movie" && item.duration != null && (
          <span className="text-white/50 text-sm">
            {Math.floor(item.duration / 60)}h {item.duration % 60}m
          </span>
        )}
        {item.genres?.length > 0 && (
          <span className="text-white/35 text-sm">{item.genres.slice(0, 2).join(" · ")}</span>
        )}
      </div>

      <p className="text-base md:text-lg text-white/65 mb-8 line-clamp-2 leading-relaxed max-w-xl">
        {item.description}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/content/${item.id}`}
          className="flex items-center gap-2.5 px-7 py-3.5 bg-white text-black rounded-xl font-bold text-base hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.25)]"
        >
          <Play className="w-5 h-5 fill-current" />
          Play Now
        </Link>
        <WatchlistButton contentId={item.id} variant="full" />
        <Link
          href={`/content/${item.id}`}
          className="flex items-center gap-2 px-5 py-3.5 bg-white/10 hover:bg-white/18 text-white rounded-xl font-semibold backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 text-base"
        >
          <Info className="w-5 h-5" />
          More Info
        </Link>
      </div>
    </motion.div>
  );
}

// ── Auto-rotating Hero Carousel ────────────────────────────────────────
function HeroCarousel({ items }: { items: Content[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const SLIDE_DURATION = 9000;

  const advance = useCallback(() => {
    setActiveIdx(i => (i + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setActiveIdx(i => (i - 1 + items.length) % items.length);
  }, [items.length]);

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
      {/* Backdrop layers */}
      <AnimatePresence>
        <HeroSlide key={active.id} item={active} isActive />
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 w-full mt-20">
        <AnimatePresence mode="wait">
          <HeroContent key={active.id} item={active} />
        </AnimatePresence>
      </div>

      {/* Slide indicators + nav */}
      <div className="absolute bottom-28 left-0 w-full z-20 pointer-events-none">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Dot + progress indicators */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {items.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setActiveIdx(i)}
                aria-label={`Go to ${item.title}`}
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

          {/* Prev / Next buttons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all hover:scale-110"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={advance}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all hover:scale-110"
              aria-label="Next"
            >
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
  const { data: trending, isLoading: trendingLoading } = useGetTrending({ limit: 15 });
  const { data: topRated } = useListContent({ type: "movie", limit: 12 });
  const { data: newReleases } = useListContent({ type: "tv", limit: 12 });

  // Hero items: first 6 trending items that have a backdrop
  const heroItems = trending?.items?.filter(i => i.backdropUrl).slice(0, 6) ?? [];

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
      <HeroCarousel items={heroItems} />

      {/* ── Content Rows ── */}
      <div className="relative z-20 -mt-24 space-y-10 md:space-y-14">
        {trending?.items?.length ? (
          <ContentCarousel title="Trending Now" items={trending.items} viewAllHref="/browse" />
        ) : null}

        {topRated?.items?.length ? (
          <section>
            <div className="px-4 md:px-8 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Highest Rated</span>
            </div>
            <ContentCarousel title="Top Rated" items={topRated.items} viewAllHref="/browse" />
          </section>
        ) : null}

        {newReleases?.items?.length ? (
          <ContentCarousel title="New Releases" items={newReleases.items} viewAllHref="/browse" />
        ) : null}

        {/* Genre rows */}
        <GenreRow genreSlug="drama" genreName="Drama" />
        <GenreRow genreSlug="crime" genreName="Crime & Thriller" />
        <GenreRow genreSlug="sci-fi" genreName="Sci-Fi" />
        <GenreRow genreSlug="comedy" genreName="Comedy" />
        <GenreRow genreSlug="action" genreName="Action & Adventure" />
        <GenreRow genreSlug="horror" genreName="Horror & Suspense" />
        <GenreRow genreSlug="animation" genreName="Animation" />
      </div>
    </div>
  );
}
