import { useState } from "react";
import { useRoute } from "wouter";
import { Play, Star, Calendar, Clock, Tv, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetContent, useListContent, type Episode, type CastMember, type Content } from "@workspace/api-client-react";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { WatchlistButton } from "@/components/content/WatchlistButton";
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { StreamPlayer } from "@/components/content/StreamPlayer";
import { formatDuration } from "@/lib/utils";
import { useRatings } from "@/hooks/useRatings";

function TrailerEmbed({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
        <iframe
          className="w-full h-full border-0"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title="Trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      className="aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative cursor-pointer group"
      onClick={() => setPlaying(true)}
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
        alt="Trailer thumbnail"
        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-300"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center pl-1.5 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300 shadow-2xl">
          <Play className="w-8 h-8 fill-white text-white" />
        </div>
      </div>
      <div className="absolute bottom-4 left-4 text-white/70 text-sm font-medium">Click to play trailer</div>
    </div>
  );
}

interface SeasonSelectorProps {
  episodes: Episode[] | null | undefined;
  onPlayEpisode: (season: number, episode: number) => void;
}

function SeasonSelector({ episodes, onPlayEpisode }: SeasonSelectorProps) {
  const [openSeason, setOpenSeason] = useState(1);

  if (!episodes || episodes.length === 0) return null;

  const seasons = [...new Set(episodes.map(e => e.season))].sort();

  return (
    <div className="space-y-3 max-w-4xl">
      {seasons.map(season => {
        const eps = episodes.filter(e => e.season === season);
        const isOpen = openSeason === season;
        return (
          <div key={season} className="border border-white/8 rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenSeason(isOpen ? -1 : season)}
              className="w-full flex items-center justify-between px-6 py-4 bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
            >
              <span className="font-display font-bold text-white text-lg">Season {season}</span>
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-sm">{eps.length} episode{eps.length !== 1 ? "s" : ""}</span>
                {isOpen ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
              </div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-white/5">
                    {eps.map(ep => (
                      <div
                        key={ep.id}
                        onClick={() => onPlayEpisode(ep.season, ep.episode)}
                        className="flex items-start gap-5 px-6 py-4 hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <div className="w-32 sm:w-44 aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-secondary/50 relative">
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-primary/40 flex items-center justify-center transition-colors">
                              <Play className="w-5 h-5 fill-white text-white pl-0.5" />
                            </div>
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                            {formatDuration(ep.duration)}
                          </div>
                        </div>
                        <div className="flex-grow pt-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-primary text-xs font-bold font-mono">E{ep.episode}</span>
                            <h4 className="text-white font-semibold text-sm truncate group-hover:text-primary/90 transition-colors">{ep.title}</h4>
                          </div>
                          <p className="text-white/50 text-xs leading-relaxed line-clamp-2">{ep.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function Detail() {
  const [, params] = useRoute("/content/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [activeTab, setActiveTab] = useState<"overview" | "episodes" | "cast">("overview");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerSeason, setPlayerSeason] = useState<number | undefined>(undefined);
  const [playerEpisode, setPlayerEpisode] = useState<number | undefined>(undefined);

  const { data: content, isLoading, isError } = useGetContent(id);
  const { data: ratings } = useRatings(content?.imdbId);

  const primaryGenre = content?.genres?.[0];
  const primaryGenreSlug = primaryGenre
    ? primaryGenre.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "")
    : undefined;
  const { data: related } = useListContent(
    { genre: primaryGenreSlug, limit: 12 },
    { query: { enabled: !!primaryGenreSlug } }
  );
  const relatedItems = related?.items?.filter(i => i.id !== id) ?? [];

  if (isLoading) return <FullPageLoader />;

  if (isError || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-white mb-4">Not Found</h1>
          <p className="text-white/50">This title doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const hasEpisodes = content.type === "tv" && content.episodes && content.episodes.length > 0;
  const backdropImage = content.backdropUrl || `${import.meta.env.BASE_URL}images/hero-bg.png`;
  const tabs: Array<"overview" | "cast" | "episodes"> = hasEpisodes
    ? ["overview", "cast", "episodes"]
    : ["overview", "cast"];

  const canStream = !!content.imdbId;

  const openPlayer = (season?: number, episode?: number) => {
    setPlayerSeason(season);
    setPlayerEpisode(episode);
    setPlayerOpen(true);
  };

  const openEpisodePlayer = (season: number, episode: number) => {
    openPlayer(season, episode);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ── Backdrop hero ── */}
      <div className="relative w-full h-[55vh] md:h-[75vh]">
        <div className="absolute inset-0">
          <img src={backdropImage} alt={content.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>

        {/* Info overlap */}
        <div className="absolute bottom-0 left-0 w-full translate-y-1/3 md:translate-y-1/4">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-6 md:gap-10 items-end">
            {/* Poster */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", damping: 20 }}
              className="hidden sm:block w-40 md:w-60 lg:w-72 flex-shrink-0 relative z-20"
            >
              <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/8">
                {content.posterUrl ? (
                  <img src={content.posterUrl} alt="Poster" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center p-4 text-center text-white/30 text-sm">
                    {content.title}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Main info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex-grow pb-6 md:pb-10 relative z-20 min-w-0"
            >
              {/* Genre chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {content.genres.slice(0, 4).map(g => (
                  <span key={g} className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-white/8 text-white/60 rounded-md border border-white/8">
                    {g}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black text-white mb-4 leading-tight drop-shadow-lg">
                {content.title}
              </h1>

              {/* Scores + metadata */}
              <div className="flex flex-wrap items-center gap-3 mb-7">
                {/* Real IMDB rating */}
                {(ratings?.imdbRating ?? 0) > 0 ? (
                  <a href={ratings!.imdbUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/25 rounded-lg hover:bg-yellow-500/20 transition-colors group">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-sm">{ratings!.imdbRating.toFixed(1)}</span>
                    {ratings!.imdbVotes && <span className="text-white/30 text-xs">({ratings!.imdbVotes})</span>}
                    <span className="text-white/35 text-xs">IMDB</span>
                    <ExternalLink className="w-2.5 h-2.5 text-white/20 group-hover:text-yellow-400/60" />
                  </a>
                ) : content.imdbScore != null && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/25 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-sm">{content.imdbScore.toFixed(1)}</span>
                    <span className="text-white/35 text-xs">IMDB</span>
                  </div>
                )}
                {/* Real Rotten Tomatoes */}
                {(ratings?.rtScore ?? 0) > 0 ? (
                  <a href={ratings!.rtSearchUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors group">
                    <span className="text-sm leading-none">🍅</span>
                    <span className={`font-bold text-sm ${ratings!.rtScore >= 60 ? "text-red-400" : "text-yellow-400"}`}>{ratings!.rtScore}%</span>
                    <span className="text-white/35 text-xs">RT</span>
                    <ExternalLink className="w-2.5 h-2.5 text-white/20 group-hover:text-red-400/60" />
                  </a>
                ) : content.rtScore != null && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/25 rounded-lg">
                    <span className="text-sm">🍅</span>
                    <span className={`font-bold text-sm ${content.rtScore >= 60 ? "text-red-400" : "text-yellow-400"}`}>{content.rtScore}%</span>
                    <span className="text-white/35 text-xs">Rotten Tomatoes</span>
                  </div>
                )}
                {/* Metacritic */}
                {(ratings?.metacritic ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <span className={`font-bold text-sm ${ratings!.metacritic >= 61 ? "text-green-400" : ratings!.metacritic >= 40 ? "text-yellow-400" : "text-red-400"}`}>{ratings!.metacritic}</span>
                    <span className="text-white/35 text-xs">Metacritic</span>
                  </div>
                )}
                <span className="flex items-center gap-1.5 text-white/50 text-sm">
                  <Calendar className="w-4 h-4" />
                  {content.releaseYear}
                </span>
                {content.rating && (
                  <span className="px-2 py-0.5 border border-white/15 rounded text-white/60 text-xs font-bold">
                    {content.rating}
                  </span>
                )}
                {content.type === "movie" && content.duration ? (
                  <span className="flex items-center gap-1.5 text-white/50 text-sm">
                    <Clock className="w-4 h-4" />
                    {formatDuration(content.duration)}
                  </span>
                ) : content.type === "tv" && content.seasons ? (
                  <span className="flex items-center gap-1.5 text-white/50 text-sm">
                    <Tv className="w-4 h-4" />
                    {content.seasons} Season{content.seasons !== 1 ? "s" : ""}
                    {content.totalEpisodes ? ` · ${content.totalEpisodes} eps` : ""}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                {canStream && (
                  <button
                    onClick={() =>
                      content.type === "tv"
                        ? openPlayer(1, 1)
                        : openPlayer()
                    }
                    className="flex items-center gap-2.5 px-6 py-3 bg-primary text-white rounded-xl font-bold text-base hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/30"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    {content.type === "tv" ? "Watch S01 E01" : "Watch Now"}
                  </button>
                )}
                {content.trailerUrl && (
                  <button
                    onClick={() => {
                      document.getElementById("trailer-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-base transition-all hover:scale-105 active:scale-95 shadow-xl ${
                      canStream
                        ? "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                        : "bg-white text-black hover:bg-white/90"
                    }`}
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Watch Trailer
                  </button>
                )}
                <WatchlistButton contentId={content.id} variant="full" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-48 md:mt-36 lg:mt-32">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/8 mb-10 overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-base font-display font-semibold capitalize tracking-wide whitespace-nowrap relative transition-colors ${
                activeTab === tab ? "text-white" : "text-white/35 hover:text-white/65"
              }`}
            >
              {tab === "episodes" ? `Episodes` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
                <div className="lg:col-span-2 space-y-10">
                  {/* Storyline */}
                  <div>
                    <h3 className="text-lg font-display font-bold text-white mb-4">Storyline</h3>
                    <p className="text-white/65 leading-relaxed text-base max-w-3xl">{content.description}</p>
                  </div>

                  {/* Trailer */}
                  {content.trailerUrl && (
                    <div id="trailer-section">
                      <h3 className="text-lg font-display font-bold text-white mb-4">Trailer</h3>
                      <TrailerEmbed videoId={content.trailerUrl} />
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-white/3 border border-white/8">
                    <h4 className="font-display font-bold text-white mb-5 text-sm uppercase tracking-wider border-b border-white/8 pb-4">
                      Details
                    </h4>
                    <dl className="space-y-4 text-sm">
                      <div>
                        <dt className="text-white/35 mb-1.5">Genres</dt>
                        <dd className="flex flex-wrap gap-1.5">
                          {content.genres.map(g => (
                            <span key={g} className="px-2.5 py-1 bg-white/6 rounded-lg text-white/80 text-xs border border-white/8">{g}</span>
                          ))}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-white/35">Year</dt>
                        <dd className="text-white/80">{content.releaseYear}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-white/35">Rating</dt>
                        <dd className="text-white/80">{content.rating || "—"}</dd>
                      </div>
                      {content.type === "movie" && content.duration && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">Runtime</dt>
                          <dd className="text-white/80">{formatDuration(content.duration)}</dd>
                        </div>
                      )}
                      {content.type === "tv" && (
                        <>
                          {content.seasons && (
                            <div className="flex justify-between">
                              <dt className="text-white/35">Seasons</dt>
                              <dd className="text-white/80">{content.seasons}</dd>
                            </div>
                          )}
                          {content.totalEpisodes && (
                            <div className="flex justify-between">
                              <dt className="text-white/35">Episodes</dt>
                              <dd className="text-white/80">{content.totalEpisodes}</dd>
                            </div>
                          )}
                        </>
                      )}
                      {(ratings?.imdbRating ?? 0) > 0 ? (
                        <div className="flex justify-between items-center">
                          <dt className="text-white/35">IMDB</dt>
                          <dd>
                            <a href={ratings!.imdbUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-bold hover:underline">
                              {ratings!.imdbRating.toFixed(1)} / 10
                            </a>
                            {ratings!.imdbVotes && <span className="text-white/30 font-normal text-xs ml-1">({ratings!.imdbVotes})</span>}
                          </dd>
                        </div>
                      ) : content.imdbScore != null && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">IMDB</dt>
                          <dd className="text-yellow-400 font-bold">{content.imdbScore.toFixed(1)} / 10</dd>
                        </div>
                      )}
                      {(ratings?.rtScore ?? 0) > 0 ? (
                        <div className="flex justify-between items-center">
                          <dt className="text-white/35">Tomatometer</dt>
                          <dd>
                            <a href={ratings!.rtSearchUrl} target="_blank" rel="noopener noreferrer" className={`font-bold hover:underline ${ratings!.rtScore >= 60 ? "text-red-400" : "text-yellow-400"}`}>
                              {ratings!.rtScore}%
                            </a>
                          </dd>
                        </div>
                      ) : content.rtScore != null && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">Tomatometer</dt>
                          <dd className={`font-bold ${content.rtScore >= 60 ? "text-red-400" : "text-yellow-400"}`}>{content.rtScore}%</dd>
                        </div>
                      )}
                      {(ratings?.metacritic ?? 0) > 0 && (
                        <div className="flex justify-between items-center">
                          <dt className="text-white/35">Metacritic</dt>
                          <dd className={`font-bold ${ratings!.metacritic >= 61 ? "text-green-400" : ratings!.metacritic >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                            {ratings!.metacritic} / 100
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "cast" && (
            <motion.div key="cast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {content.cast && content.cast.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                  {content.cast.map((actor, idx) => (
                    <div key={idx} className="group">
                      <div className="aspect-square rounded-2xl overflow-hidden bg-secondary mb-3 relative">
                        <img
                          src={actor.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(actor.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`}
                          alt={actor.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <h4 className="font-bold text-white text-sm line-clamp-1">{actor.name}</h4>
                      <p className="text-xs text-primary/80 mt-0.5 line-clamp-1">{actor.character}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 py-12 text-center">Cast information not available.</p>
              )}
            </motion.div>
          )}

          {activeTab === "episodes" && hasEpisodes && (
            <motion.div key="episodes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <SeasonSelector
                episodes={content.episodes}
                onPlayEpisode={openEpisodePlayer}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── More Like This ── */}
        {relatedItems.length > 0 && (
          <div className="mt-20 -mx-4 md:-mx-8">
            <ContentCarousel title="More Like This" items={relatedItems} />
          </div>
        )}
      </div>

      {/* ── Stream Player Modal ── */}
      {playerOpen && content.imdbId && (
        <StreamPlayer
          imdbId={content.imdbId}
          title={content.title}
          type={content.type as "movie" | "tv"}
          season={playerSeason}
          episode={playerEpisode}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </div>
  );
}
