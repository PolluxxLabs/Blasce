import { Link } from "wouter";
import { Play, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Content } from "@workspace/api-client-react";
import { WatchlistButton } from "./WatchlistButton";

interface ContentCardProps {
  content: Content;
  index?: number;
}

export function ContentCard({ content, index = 0 }: ContentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="group relative flex-shrink-0 w-full rounded-xl overflow-hidden bg-secondary cursor-pointer"
    >
      <Link href={`/content/${content.id}`} className="block relative aspect-[2/3] overflow-hidden">
        {/* Poster */}
        {content.posterUrl ? (
          <img
            src={content.posterUrl}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex flex-col items-center justify-center p-4 text-center">
            <span className="font-display font-bold text-xl text-white/50">{content.title}</span>
          </div>
        )}

        {/* Always-visible bottom score strip */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pb-2.5 px-2.5 flex items-end justify-between">
          <span className="flex items-center gap-1 text-yellow-400 font-bold text-xs">
            <Star className="w-3 h-3 fill-current" />
            {content.imdbScore?.toFixed(1) ?? "—"}
          </span>
          {content.rtScore != null && (
            <span className="text-white/70 font-medium text-xs">🍅 {content.rtScore}%</span>
          )}
        </div>

        {/* Type badge — top left */}
        {content.type === "tv" && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-primary/80 backdrop-blur-sm text-white text-[9px] font-extrabold uppercase tracking-widest rounded">
            Series
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
          {/* Watchlist button */}
          <div className="self-end translate-y-[-6px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75">
            <WatchlistButton contentId={content.id} />
          </div>

          {/* Center play button */}
          <div className="absolute inset-0 flex items-center justify-center scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white flex items-center justify-center pl-0.5 shadow-xl">
              <Play className="w-5 h-5 fill-current" />
            </div>
          </div>

          {/* Bottom info */}
          <div className="translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-50">
            <p className="text-white/60 text-xs mb-1">{content.releaseYear} · {content.rating}</p>
            <h3 className="font-display font-bold text-sm text-white leading-snug line-clamp-2">
              {content.title}
            </h3>
            {content.genres.length > 0 && (
              <p className="text-white/40 text-[11px] mt-1 truncate">{content.genres.slice(0, 2).join(" · ")}</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
