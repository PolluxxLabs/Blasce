import { useState } from "react";
import { useRoute } from "wouter";
import { Play, Star, Calendar, Clock, Tv } from "lucide-react";
import { motion } from "framer-motion";
import { useGetContent } from "@workspace/api-client-react";
import { LoadingSpinner, FullPageLoader } from "@/components/ui/LoadingSpinner";
import { WatchlistButton } from "@/components/content/WatchlistButton";
import { formatDuration } from "@/lib/utils";

export default function Detail() {
  const [, params] = useRoute("/content/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  
  const [activeTab, setActiveTab] = useState<"overview" | "episodes" | "cast">("overview");

  const { data: content, isLoading, isError } = useGetContent(id);

  if (isLoading) return <FullPageLoader />;
  
  if (isError || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-white mb-4">Content Not Found</h1>
          <p className="text-white/60">The title you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const hasEpisodes = content.type === 'tv' && content.episodes && content.episodes.length > 0;
  const backdropImage = content.backdropUrl || `${import.meta.env.BASE_URL}images/hero-bg.png`;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Hero Backdrop */}
      <div className="relative w-full h-[60vh] md:h-[80vh]">
        <div className="absolute inset-0">
          <img 
            src={backdropImage} 
            alt={content.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        {/* Content Info Overlap */}
        <div className="absolute bottom-0 left-0 w-full translate-y-1/4">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-8 md:gap-12 items-end">
            {/* Poster */}
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="w-48 md:w-72 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border-2 border-white/10 hidden sm:block relative z-20"
            >
              <div className="aspect-[2/3] bg-secondary">
                {content.posterUrl ? (
                   <img src={content.posterUrl} alt="Poster" className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center p-4 text-center text-white/50">{content.title}</div>
                )}
              </div>
            </motion.div>

            {/* Main Info */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-grow pb-8 relative z-20"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black text-white mb-4 leading-tight drop-shadow-lg">
                {content.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-white/80 font-medium mb-8">
                <span className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                  <Star className="w-4 h-4 fill-current" />
                  {content.imdbScore?.toFixed(1) || "N/A"} <span className="text-white/40 text-xs ml-0.5">IMDB</span>
                </span>
                {content.rtScore != null && (
                  <span className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 font-semibold">
                    🍅 {content.rtScore}% <span className="text-white/40 text-xs font-normal ml-0.5">RT</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-white/50" />
                  {content.releaseYear}
                </span>
                {content.rating && (
                  <span className="px-2 py-0.5 border border-white/20 rounded text-white/90">
                    {content.rating}
                  </span>
                )}
                {content.type === 'movie' && content.duration ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-white/50" />
                    {formatDuration(content.duration)}
                  </span>
                ) : content.type === 'tv' && content.seasons ? (
                  <span className="flex items-center gap-1.5">
                    <Tv className="w-4 h-4 text-white/50" />
                    {content.seasons} {content.seasons === 1 ? 'Season' : 'Seasons'}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <button className="flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(var(--primary),0.4)] hover:shadow-[0_0_50px_rgba(var(--primary),0.6)] hover:-translate-y-1">
                  <Play className="w-6 h-6 fill-current" />
                  Play Trailer
                </button>
                <WatchlistButton contentId={content.id} variant="full" className="bg-secondary/80 backdrop-blur-md" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-40 md:mt-32">
        {/* Tabs */}
        <div className="flex gap-8 border-b border-white/10 mb-12 overflow-x-auto hide-scrollbar">
          {(["overview", "cast"] as const).concat(hasEpisodes ? ["episodes"] as const : []).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-lg font-display font-semibold capitalize tracking-wide whitespace-nowrap relative ${
                activeTab === tab ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === "overview" && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-12"
            >
              <div className="lg:col-span-2 space-y-8">
                <div>
                  <h3 className="text-xl font-display font-bold text-white mb-4">Storyline</h3>
                  <p className="text-lg text-white/70 leading-relaxed max-w-4xl">
                    {content.description}
                  </p>
                </div>
                
                {content.trailerUrl && (
                  <div>
                    <h3 className="text-xl font-display font-bold text-white mb-4">Trailer</h3>
                    <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
                       {/* Assuming trailerUrl is a full youtube embed URL or we format it. Simplification for demo: iframe */}
                       <iframe 
                        width="100%" 
                        height="100%" 
                        src={content.trailerUrl.includes('youtube') ? content.trailerUrl : `https://www.youtube.com/embed/dQw4w9WgXcQ`} 
                        title="Trailer" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        className="border-0"
                      ></iframe>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-secondary/30 border border-white/5 backdrop-blur-sm">
                  <h4 className="font-display font-bold text-white mb-4 border-b border-white/10 pb-4">Details</h4>
                  <dl className="space-y-4 text-sm">
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-white/40">Genres</dt>
                      <dd className="col-span-2 text-white/90 flex flex-wrap gap-2">
                        {content.genres.map(g => (
                          <span key={g} className="px-2 py-1 bg-white/5 rounded-md text-xs">{g}</span>
                        ))}
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <dt className="text-white/40">Status</dt>
                      <dd className="col-span-2 text-white/90">Released</dd>
                    </div>
                    {content.type === 'tv' && (
                       <div className="grid grid-cols-3 gap-4">
                        <dt className="text-white/40">Network</dt>
                        <dd className="col-span-2 text-white/90">Blasce Original</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "cast" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {content.cast && content.cast.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {content.cast.map((actor, idx) => (
                    <div key={idx} className="group cursor-pointer">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-secondary mb-3 relative">
                        {actor.photoUrl ? (
                           <img src={actor.photoUrl} alt={actor.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${actor.name}&backgroundColor=transparent`} alt="Avatar" className="w-2/3 h-2/3 opacity-50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <h4 className="font-bold text-white text-sm line-clamp-1">{actor.name}</h4>
                      <p className="text-xs text-primary mt-1 line-clamp-1">{actor.character}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/50">Cast information not available.</p>
              )}
            </motion.div>
          )}

          {activeTab === "episodes" && hasEpisodes && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl space-y-4">
              {content.episodes?.map((ep) => (
                <div key={ep.id} className="group flex flex-col sm:flex-row gap-6 p-4 md:p-6 rounded-2xl bg-secondary/20 hover:bg-secondary/50 border border-transparent hover:border-white/10 transition-all cursor-pointer">
                  <div className="w-full sm:w-64 aspect-video bg-black rounded-xl overflow-hidden relative flex-shrink-0">
                    {ep.thumbnailUrl ? (
                      <img src={ep.thumbnailUrl} alt={ep.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white/30" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur text-white text-xs px-2 py-1 rounded font-mono">
                      {formatDuration(ep.duration)}
                    </div>
                    {/* Play Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center pl-1 shadow-lg shadow-primary/50 text-white">
                        <Play className="w-5 h-5 fill-current" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-grow flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-primary font-mono text-sm font-bold">S{ep.season} E{ep.episode}</span>
                      <h4 className="text-xl font-bold text-white">{ep.title}</h4>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed line-clamp-3">
                      {ep.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
