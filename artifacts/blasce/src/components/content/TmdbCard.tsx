import { Link } from "wouter";
import { Play, Star } from "lucide-react";
import { motion } from "framer-motion";
import { tmdbPoster } from "@/lib/tmdb";
import type { TMDBTrendingItem } from "@/lib/tmdb";

interface TmdbCardProps {
  item: TMDBTrendingItem;
  index?: number;
}

export function TmdbCard({ item, index = 0 }: TmdbCardProps) {
  const href = item.media_type === "tv"
    ? `/watch/tv/${item.id}`
    : `/watch/movie/${item.id}`;
  const title = item.title || item.name || "";
  const poster = tmdbPoster(item.poster_path);
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="group relative flex-shrink-0 w-full rounded-xl overflow-hidden bg-secondary cursor-pointer"
    >
      <Link href={href} className="block relative aspect-[2/3] overflow-hidden">
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex flex-col items-center justify-center p-4 text-center">
            <span className="font-display font-bold text-xl text-white/50">{title}</span>
          </div>
        )}

        {/* Score strip */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pb-2.5 px-2.5 flex items-end justify-between">
          <span className="flex items-center gap-1 text-yellow-400 font-bold text-xs">
            <Star className="w-3 h-3 fill-current" />
            {item.vote_average ? item.vote_average.toFixed(1) : "—"}
          </span>
        </div>

        {/* Type badge */}
        {item.media_type === "tv" && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary/80 backdrop-blur-sm text-white text-[9px] font-extrabold uppercase tracking-widest rounded">
            Series
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
          <div className="absolute inset-0 flex items-center justify-center scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center pl-0.5 shadow-xl">
              <Play className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-50">
            <p className="text-white/60 text-xs mb-1">{year}</p>
            <h3 className="font-display font-bold text-sm text-white leading-snug line-clamp-2">{title}</h3>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
