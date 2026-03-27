import { Link } from "wouter";
import { Play, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Content } from "@workspace/api-client-react";
import { WatchlistButton } from "./WatchlistButton";

interface ContentCardProps {
  content: Content;
  index?: number;
  rank?: number;
}

export function ContentCard({ content, index = 0, rank }: ContentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.035 }}
      className="group relative flex-shrink-0 w-full rounded-xl overflow-hidden bg-secondary cursor-pointer"
    >
      <Link href={`/content/${content.id}`} className="block relative aspect-[2/3] overflow-hidden">
        {/* Rank badge */}
        {rank != null && (
          <div className="absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <span className="text-primary font-display font-bold text-[10px]">{rank}</span>
          </div>
        )}

        {/* Type badge */}
        {content.type === "tv" && (
          <div className="absolute top-2.5 right-2.5 z-10 px-1.5 py-0.5 bg-accent/80 backdrop-blur-sm text-white text-[8px] font-bold uppercase tracking-widest rounded-md">
            Series
          </div>
        )}

        {/* Poster */}
        {content.posterUrl ? (
          <img
            src={content.posterUrl}
            alt={content.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-background flex flex-col items-center justify-center p-4 text-center">
            <span className="font-display font-bold text-lg text-white/30 leading-tight">{content.title}</span>
          </div>
        )}

        {/* Score strip (always visible) */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-10 pb-2 px-2.5 flex items-end justify-between">
          <span className="flex items-center gap-1 text-primary font-bold text-xs">
            <Star className="w-3 h-3 fill-current" />
            {content.imdbScore?.toFixed(1) ?? "—"}
          </span>
          {content.rtScore != null && (
            <span className="text-white/60 font-medium text-xs">🍅 {content.rtScore}%</span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
          {/* Watchlist button */}
          <div className="self-end translate-y-[-5px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-250 delay-75">
            <WatchlistButton contentId={content.id} />
          </div>

          {/* Center play */}
          <div className="absolute inset-0 flex items-center justify-center scale-80 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
            <div className="w-11 h-11 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-primary flex items-center justify-center pl-0.5 shadow-xl">
              <Play className="w-5 h-5 fill-current" />
            </div>
          </div>

          {/* Bottom info */}
          <div className="translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-50">
            <p className="text-white/50 text-[11px] mb-1">{content.releaseYear}{content.rating ? ` · ${content.rating}` : ""}</p>
            <h3 className="font-display font-bold text-sm text-white leading-snug line-clamp-2">{content.title}</h3>
            {content.genres.length > 0 && (
              <p className="text-white/35 text-[10px] mt-1 truncate">{content.genres.slice(0, 2).join(" · ")}</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
