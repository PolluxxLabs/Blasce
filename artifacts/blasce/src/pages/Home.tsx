import { Link } from "wouter";
import { Play, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useGetFeaturedHero, useGetTrending, useListGenres, useListContent } from "@workspace/api-client-react";
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { WatchlistButton } from "@/components/content/WatchlistButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function GenreRow({ genreSlug, genreName }: { genreSlug: string, genreName: string }) {
  const { data, isLoading } = useListContent({ genre: genreSlug, limit: 12 });

  if (isLoading) return <LoadingSpinner className="py-12" />;
  if (!data?.items?.length) return null;

  return <ContentCarousel title={genreName} items={data.items} />;
}

export default function Home() {
  const { data: hero, isLoading: heroLoading } = useGetFeaturedHero();
  const { data: trending, isLoading: trendingLoading } = useGetTrending({ limit: 15 });
  const { data: genresData } = useListGenres();

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
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] w-full flex items-center">
        {/* Background Image & Gradients */}
        <div className="absolute inset-0 overflow-hidden hero-mask">
          <img 
            src={heroBg} 
            alt={hero?.title || "Featured"} 
            className="w-full h-full object-cover scale-105 motion-safe:animate-[pulse_20s_ease-in-out_infinite_alternate]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        {/* Hero Content */}
        {hero && (
          <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 w-full mt-20">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                  Featured
                </span>
                {hero.type === 'movie' && (
                  <span className="text-white/60 text-sm font-medium">{hero.releaseYear}</span>
                )}
                {hero.rating && (
                  <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs font-bold backdrop-blur-md">
                    {hero.rating}
                  </span>
                )}
              </div>

              <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-tight mb-6 text-balance drop-shadow-2xl">
                {hero.title}
              </h1>
              
              <p className="text-lg md:text-xl text-white/70 mb-8 line-clamp-3 leading-relaxed max-w-xl">
                {hero.description}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link href={`/content/${hero.id}`} className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-bold text-lg overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-white via-slate-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Play className="w-6 h-6 fill-current relative z-10" />
                  <span className="relative z-10">Play Now</span>
                </Link>
                
                <WatchlistButton contentId={hero.id} variant="full" />
                
                <Link href={`/content/${hero.id}`} className="flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95">
                  <Info className="w-5 h-5" />
                  More Info
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {/* Content Rows */}
      <div className="relative z-20 -mt-32 space-y-8 md:space-y-12">
        {trendingLoading ? (
          <LoadingSpinner />
        ) : trending?.items ? (
          <ContentCarousel title="Trending Now" items={trending.items} />
        ) : null}

        {genresData?.genres?.slice(0, 5).map(genre => (
          <GenreRow key={genre.id} genreSlug={genre.slug} genreName={genre.name} />
        ))}
      </div>
    </div>
  );
}
