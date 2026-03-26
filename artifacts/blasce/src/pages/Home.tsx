import { Link } from "wouter";
import { Play, Info, Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import {
  useGetFeaturedHero,
  useGetTrending,
  useGetTopRated,
  useGetNewReleases,
  useListContent,
} from "@workspace/api-client-react";
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { WatchlistButton } from "@/components/content/WatchlistButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function GenreRow({ genreSlug, genreName }: { genreSlug: string; genreName: string }) {
  const { data, isLoading } = useListContent({ genre: genreSlug, limit: 12 });
  if (isLoading) return <LoadingSpinner className="py-12" />;
  if (!data?.items?.length) return null;
  return <ContentCarousel title={genreName} items={data.items} viewAllHref={`/browse?genre=${genreSlug}`} />;
}

export default function Home() {
  const { data: hero, isLoading: heroLoading } = useGetFeaturedHero();
  const { data: trending } = useGetTrending({ limit: 15 });
  const { data: topRated } = useGetTopRated({ limit: 12 });
  const { data: newReleases } = useGetNewReleases({ limit: 12 });

  if (heroLoading) {
    return (
      <div className="min-h-screen bg-background relative animate-pulse">
        <div className="absolute inset-0 bg-secondary/50" />
      </div>
    );
  }

  const heroBg = hero?.backdropUrl || `${import.meta.env.BASE_URL}images/hero-bg.png`;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Hero Section ── */}
      <section className="relative h-[88vh] min-h-[620px] w-full flex items-center">
        <div className="absolute inset-0 overflow-hidden hero-mask">
          <img
            src={heroBg}
            alt={hero?.title || "Featured"}
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
        </div>

        {hero && (
          <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 w-full mt-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl"
            >
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                  Featured
                </span>
                {hero.type === "tv" && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-bold">
                    TV Series
                  </span>
                )}
                {hero.rating && (
                  <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs font-bold backdrop-blur-md">
                    {hero.rating}
                  </span>
                )}
                <span className="text-white/50 text-sm font-medium">{hero.releaseYear}</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-tight mb-4 text-balance drop-shadow-2xl">
                {hero.title}
              </h1>

              {/* Score badges */}
              <div className="flex items-center gap-3 mb-5">
                {hero.imdbScore != null && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-lg backdrop-blur-md border border-yellow-500/20">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-sm">{hero.imdbScore.toFixed(1)}</span>
                    <span className="text-white/40 text-xs">IMDB</span>
                  </div>
                )}
                {hero.rtScore != null && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-lg backdrop-blur-md border border-red-500/20">
                    <span className="text-sm">🍅</span>
                    <span className={`font-bold text-sm ${hero.rtScore >= 60 ? "text-red-400" : "text-yellow-400"}`}>
                      {hero.rtScore}%
                    </span>
                    <span className="text-white/40 text-xs">RT</span>
                  </div>
                )}
                {hero.type === "tv" && hero.seasons != null && (
                  <span className="text-white/50 text-sm">
                    {hero.seasons} Season{hero.seasons !== 1 ? "s" : ""}
                    {hero.totalEpisodes ? ` · ${hero.totalEpisodes} eps` : ""}
                  </span>
                )}
                {hero.type === "movie" && hero.duration != null && (
                  <span className="text-white/50 text-sm">
                    {Math.floor(hero.duration / 60)}h {hero.duration % 60}m
                  </span>
                )}
              </div>

              <p className="text-lg md:text-xl text-white/70 mb-8 line-clamp-3 leading-relaxed max-w-xl">
                {hero.description}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={`/content/${hero.id}`}
                  className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-bold text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white via-slate-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Play className="w-6 h-6 fill-current relative z-10" />
                  <span className="relative z-10">Play Now</span>
                </Link>

                <WatchlistButton contentId={hero.id} variant="full" />

                <Link
                  href={`/content/${hero.id}`}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95"
                >
                  <Info className="w-5 h-5" />
                  More Info
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {/* ── Content Rows ── */}
      <div className="relative z-20 -mt-32 space-y-8 md:space-y-12">
        {trending?.items?.length ? (
          <ContentCarousel title="Trending Now" items={trending.items} viewAllHref="/browse" />
        ) : null}

        {/* Top Rated */}
        {topRated?.items?.length ? (
          <section>
            <div className="px-4 md:px-8 max-w-[1600px] mx-auto mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              <span className="text-white/50 text-sm font-semibold uppercase tracking-wider">Editor's pick</span>
            </div>
            <ContentCarousel title="Top Rated" items={topRated.items} viewAllHref="/browse" />
          </section>
        ) : null}

        {/* New Releases */}
        {newReleases?.items?.length ? (
          <ContentCarousel title="New Releases" items={newReleases.items} viewAllHref="/browse" />
        ) : null}

        {/* Genre rows: curated selection */}
        <GenreRow genreSlug="drama" genreName="Drama" />
        <GenreRow genreSlug="crime" genreName="Crime & Thriller" />
        <GenreRow genreSlug="sci-fi" genreName="Sci-Fi" />
        <GenreRow genreSlug="comedy" genreName="Comedy" />
        <GenreRow genreSlug="action" genreName="Action & Adventure" />
      </div>
    </div>
  );
}
