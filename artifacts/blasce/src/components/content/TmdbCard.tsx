import { Link } from "wouter";
import { Play, Star } from "lucide-react";
import { motion } from "framer-motion";
import { tmdbPoster } from "@/lib/tmdb";
import type { TMDBTrendingItem } from "@/lib/tmdb";

interface TmdbCardProps {
  item: TMDBTrendingItem;
  index?: number;
  rank?: number;
}

export function TmdbCard({ item, index = 0, rank }: TmdbCardProps) {
  const href = item.media_type === "tv"
    ? `/watch/tv/${item.id}`
    : `/watch/movie/${item.id}`;
  const title = item.title || item.name || "";
  const poster = tmdbPoster(item.poster_path);
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.035 }}
      className="group relative flex-shrink-0 w-full rounded-xl overflow-hidden bg-secondary cursor-pointer"
    >
      <Link href={href} className="block relative aspect-[2/3] overflow-hidden">
        {/* Rank badge */}
        {rank != null && (
          <div className="absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <span className="text-primary font-display font-bold text-[10px]">{rank}</span>
          </div>
        )}

        {/* Type badge */}
        {item.media_type === "tv" && (
          <div className="absolute top-2.5 right-2.5 z-10 px-1.5 py-0.5 bg-accent/80 backdrop-blur-sm text-white text-[8px] font-bold uppercase tracking-widest rounded-md">
            Series
          </div>
        )}

        {/* Poster */}
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-background flex flex-col items-center justify-center p-4 text-center">
            <span className="font-display font-bold text-lg text-white/30 leading-tight">{title}</span>
          </div>
        )}

        {/* Score strip (always visible) */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-10 pb-2 px-2.5 flex items-end justify-between">
          <span className="flex items-center gap-1 text-primary font-bold text-xs">
            <Star className="w-3 h-3 fill-current" />
            {item.vote_average ? item.vote_average.toFixed(1) : "—"}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
          {/* Center play */}
          <div className="absolute inset-0 flex items-center justify-center scale-80 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
            <div className="w-11 h-11 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-primary flex items-center justify-center pl-0.5 shadow-xl">
              <Play className="w-5 h-5 fill-current" />
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-3 left-3 right-3 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-50">
            <p className="text-white/50 text-[11px] mb-1">{year}</p>
            <h3 className="font-display font-bold text-sm text-white leading-snug line-clamp-2">{title}</h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
