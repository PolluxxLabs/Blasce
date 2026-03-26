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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative flex-shrink-0 w-full rounded-2xl overflow-hidden bg-secondary border border-white/5"
    >
      <Link href={`/content/${content.id}`} className="block relative aspect-[2/3] overflow-hidden cursor-pointer">
        {/* Poster Image */}
        {content.posterUrl ? (
          <img
            src={content.posterUrl}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex flex-col items-center justify-center p-4 text-center">
            <span className="font-display font-bold text-xl text-white/50">{content.title}</span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          
          {/* Top Actions */}
          <div className="absolute top-3 right-3 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100 z-20">
            <WatchlistButton contentId={content.id} />
          </div>

          {/* Center Play Button */}
          <div className="absolute inset-0 flex items-center justify-center scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-primary/90 text-white flex items-center justify-center pl-1 shadow-lg shadow-primary/30 backdrop-blur-md">
              <Play className="w-6 h-6 fill-current" />
            </div>
          </div>

          {/* Bottom Info */}
          <div className="translate-y-[20px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-75 relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm">
                {content.rating}
              </span>
              <span className="text-xs text-white/70 font-medium">{content.releaseYear}</span>
            </div>
            <h3 className="font-display font-bold text-lg text-white leading-tight mb-1 line-clamp-1">
              {content.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-white/60">
              <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                <Star className="w-3 h-3 fill-current" />
                {content.imdbScore?.toFixed(1) || "N/A"}
              </span>
              {content.rtScore != null && (
                <span className="flex items-center gap-1 text-red-400 font-semibold">
                  🍅 {content.rtScore}%
                </span>
              )}
              <span className="truncate">{content.genres.slice(0, 2).join(" • ")}</span>
            </div>
          </div>
        </div>
        
        {/* Default subtle gradient at bottom so title is visible if we want to show it outside hover */}
      </Link>
    </motion.div>
  );
}
