import { useState } from "react";
import { useRoute } from "wouter";
import { Play, Star, Calendar, Clock, Tv, ChevronDown, ChevronUp, ExternalLink, Globe, Trophy, Clapperboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetContent, useListContent, type Episode, type Content } from "@workspace/api-client-react";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { WatchlistButton } from "@/components/content/WatchlistButton";
import { ContentCarousel } from "@/components/content/ContentCarousel";
import { StreamPlayer } from "@/components/content/StreamPlayer";
import { formatDuration } from "@/lib/utils";
import { useMeta, type MetaData } from "@/hooks/useMeta";

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
                  key="eps"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-white/5">
                    {eps.sort((a, b) => a.episode - b.episode).map(ep => (
                      <div
                        key={ep.id}
                        onClick={() => onPlayEpisode(ep.season, ep.episode)}
                        className="flex gap-4 p-4 cursor-pointer hover:bg-white/4 transition-colors group"
                      >
                        <div className="relative w-32 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-secondary">
                          {ep.thumbnailUrl ? (
                            <img src={ep.thumbnailUrl} alt={ep.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">No preview</div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-6 h-6 fill-white text-white" />
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

function ActorCard({ name, character, photoUrl }: { name: string; character?: string; photoUrl?: string }) {
  const avatar = photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`;
  return (
    <div className="group">
      <div className="aspect-square rounded-2xl overflow-hidden bg-secondary mb-3 relative">
        <img
          src={avatar}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <h4 className="font-bold text-white text-sm line-clamp-1">{name}</h4>
      {character && <p className="text-xs text-primary/80 mt-0.5 line-clamp-1">{character}</p>}
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
  const { data: meta } = useMeta(content?.imdbId);

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

  const openPlayer = (season?: number, episode?: number) => {
    setPlayerSeason(season);
    setPlayerEpisode(episode);
    setPlayerOpen(true);
  };

  // Merge genres from DB and OMDB, deduplicated
  const allGenres = [...new Set([
    ...(content.genres ?? []),
    ...(meta?.genres ?? []),
  ])].slice(0, 6);

  // Use OMDB poster as fallback
  const posterUrl = content.posterUrl || meta?.poster || null;

  // Use OMDB full plot as description
  const description = meta?.plot || content.description;

  // Cast: use DB cast if available, otherwise use OMDB actors
  const dbCast = content.cast ?? [];
  const omdbActors = (meta?.actors ?? []).map(name => ({ name, character: "", photoUrl: undefined as string | undefined }));
  const castList = dbCast.length > 0 ? dbCast : omdbActors;

  // Ratings from meta
  const hasImdb = (meta?.imdbRating ?? 0) > 0;
  const hasRt = (meta?.rtScore ?? 0) > 0;
  const hasMeta = (meta?.metacritic ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ── Backdrop hero ── */}
      <div className="relative w-full h-[55vh] md:h-[75vh]">
        <div className="absolute inset-0">
          <img src={backdropImage} alt={content.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>

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
                {posterUrl ? (
                  <img src={posterUrl} alt="Poster" className="w-full h-full object-cover" />
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
                {allGenres.map(g => (
                  <span key={g} className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-white/8 text-white/60 rounded-md border border-white/8">
                    {g}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black text-white mb-4 leading-tight drop-shadow-lg">
                {content.title}
              </h1>

              {/* Director line */}
              {meta?.directors && meta.directors.length > 0 && (
                <p className="text-white/45 text-sm mb-4 flex items-center gap-2">
                  <Clapperboard className="w-3.5 h-3.5 flex-shrink-0" />
                  Directed by <span className="text-white/75 font-medium">{meta.directors.join(", ")}</span>
                </p>
              )}

              {/* Ratings row */}
              <div className="flex flex-wrap items-center gap-3 mb-7">
                {hasImdb ? (
                  <a href={meta!.imdbUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/25 rounded-lg hover:bg-yellow-500/20 transition-colors group">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-sm">{meta!.imdbRating.toFixed(1)}</span>
                    {meta!.imdbVotes && <span className="text-white/30 text-xs">({meta!.imdbVotes})</span>}
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
                {hasRt ? (
                  <a href={meta!.rtSearchUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors group">
                    <span className="text-sm leading-none">🍅</span>
                    <span className={`font-bold text-sm ${meta!.rtScore >= 60 ? "text-red-400" : "text-yellow-400"}`}>{meta!.rtScore}%</span>
                    <span className="text-white/35 text-xs">RT</span>
                    <ExternalLink className="w-2.5 h-2.5 text-white/20 group-hover:text-red-400/60" />
                  </a>
                ) : content.rtScore != null && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/25 rounded-lg">
                    <span className="text-sm">🍅</span>
                    <span className={`font-bold text-sm ${content.rtScore >= 60 ? "text-red-400" : "text-yellow-400"}`}>{content.rtScore}%</span>
                    <span className="text-white/35 text-xs">RT</span>
                  </div>
                )}
                {hasMeta && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <span className={`font-bold text-sm ${meta!.metacritic >= 61 ? "text-green-400" : meta!.metacritic >= 40 ? "text-yellow-400" : "text-red-400"}`}>{meta!.metacritic}</span>
                    <span className="text-white/35 text-xs">Metacritic</span>
                  </div>
                )}
                <span className="flex items-center gap-1.5 text-white/50 text-sm">
                  <Calendar className="w-4 h-4" />
                  {meta?.year || content.releaseYear}
                </span>
                {(meta?.rated || content.rating) && (
                  <span className="px-2 py-0.5 border border-white/15 rounded text-white/60 text-xs font-bold">
                    {meta?.rated || content.rating}
                  </span>
                )}
                {content.type === "movie" && (meta?.runtime || content.duration) ? (
                  <span className="flex items-center gap-1.5 text-white/50 text-sm">
                    <Clock className="w-4 h-4" />
                    {meta?.runtime || formatDuration(content.duration)}
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
                <button
                  onClick={() => content.type === "tv" ? openPlayer(1, 1) : openPlayer()}
                  className="flex items-center gap-2.5 px-6 py-3 bg-primary text-white rounded-xl font-bold text-base hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/30"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {content.type === "tv" ? "Watch S01 E01" : "Watch Now"}
                </button>
                {content.trailerUrl && (
                  <button
                    onClick={() => document.getElementById("trailer-section")?.scrollIntoView({ behavior: "smooth" })}
                    className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-base bg-white/10 text-white hover:bg-white/20 border border-white/15 transition-all hover:scale-105 active:scale-95 shadow-xl"
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
              {tab === "episodes" ? "Episodes" : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                  {description && (
                    <div>
                      <h3 className="text-lg font-display font-bold text-white mb-4">Storyline</h3>
                      <p className="text-white/65 leading-relaxed text-base max-w-3xl">{description}</p>
                    </div>
                  )}

                  {/* Top Cast preview */}
                  {castList.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-display font-bold text-white">Top Cast</h3>
                        <button onClick={() => setActiveTab("cast")} className="text-sm text-primary hover:text-primary/80 transition-colors">
                          See all →
                        </button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {castList.slice(0, 5).map((actor, idx) => (
                          <ActorCard
                            key={idx}
                            name={actor.name}
                            character={"character" in actor ? actor.character : undefined}
                            photoUrl={"photoUrl" in actor ? actor.photoUrl : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  )}

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
                    <h4 className="font-display font-bold text-white mb-5 text-sm uppercase tracking-wider border-b border-white/8 pb-4">Details</h4>
                    <dl className="space-y-4 text-sm">
                      {allGenres.length > 0 && (
                        <div>
                          <dt className="text-white/35 mb-1.5">Genres</dt>
                          <dd className="flex flex-wrap gap-1.5">
                            {allGenres.map(g => (
                              <span key={g} className="px-2.5 py-1 bg-white/6 rounded-lg text-white/80 text-xs border border-white/8">{g}</span>
                            ))}
                          </dd>
                        </div>
                      )}
                      {meta?.directors && meta.directors.length > 0 && (
                        <div>
                          <dt className="text-white/35 mb-1">Director{meta.directors.length > 1 ? "s" : ""}</dt>
                          <dd className="text-white/80">{meta.directors.join(", ")}</dd>
                        </div>
                      )}
                      {meta?.writers && meta.writers.length > 0 && (
                        <div>
                          <dt className="text-white/35 mb-1">Writer{meta.writers.length > 1 ? "s" : ""}</dt>
                          <dd className="text-white/80">{meta.writers.slice(0, 3).join(", ")}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-white/35">Year</dt>
                        <dd className="text-white/80">{meta?.year || content.releaseYear}</dd>
                      </div>
                      {(meta?.rated || content.rating) && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">Rating</dt>
                          <dd className="text-white/80">{meta?.rated || content.rating}</dd>
                        </div>
                      )}
                      {content.type === "movie" && (meta?.runtime || content.duration) && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">Runtime</dt>
                          <dd className="text-white/80">{meta?.runtime || formatDuration(content.duration)}</dd>
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
                      {meta?.language && (
                        <div className="flex justify-between items-start gap-2">
                          <dt className="text-white/35 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Language</dt>
                          <dd className="text-white/80 text-right">{meta.language}</dd>
                        </div>
                      )}
                      {meta?.country && (
                        <div className="flex justify-between items-start gap-2">
                          <dt className="text-white/35">Country</dt>
                          <dd className="text-white/80 text-right">{meta.country}</dd>
                        </div>
                      )}
                      {meta?.boxOffice && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">Box Office</dt>
                          <dd className="text-white/80 font-medium">{meta.boxOffice}</dd>
                        </div>
                      )}
                      {/* Ratings */}
                      {hasImdb && (
                        <div className="flex justify-between items-center">
                          <dt className="text-white/35">IMDB</dt>
                          <dd>
                            <a href={meta!.imdbUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-bold hover:underline">
                              {meta!.imdbRating.toFixed(1)} / 10
                            </a>
                            {meta!.imdbVotes && <span className="text-white/30 font-normal text-xs ml-1">({meta!.imdbVotes})</span>}
                          </dd>
                        </div>
                      )}
                      {hasRt && (
                        <div className="flex justify-between items-center">
                          <dt className="text-white/35">Tomatometer</dt>
                          <dd>
                            <a href={meta!.rtSearchUrl} target="_blank" rel="noopener noreferrer" className={`font-bold hover:underline ${meta!.rtScore >= 60 ? "text-red-400" : "text-yellow-400"}`}>
                              {meta!.rtScore}%
                            </a>
                          </dd>
                        </div>
                      )}
                      {hasMeta && (
                        <div className="flex justify-between items-center">
                          <dt className="text-white/35">Metacritic</dt>
                          <dd className={`font-bold ${meta!.metacritic >= 61 ? "text-green-400" : meta!.metacritic >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                            {meta!.metacritic} / 100
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Awards */}
                  {meta?.awards && (
                    <div className="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/15">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <h4 className="font-display font-bold text-yellow-400 text-sm uppercase tracking-wider">Awards</h4>
                      </div>
                      <p className="text-white/65 text-sm leading-relaxed">{meta.awards}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "cast" && (
            <motion.div key="cast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {castList.length > 0 ? (
                <>
                  {/* OMDB actors header note when DB cast is empty */}
                  {dbCast.length === 0 && meta?.actors && meta.actors.length > 0 && (
                    <p className="text-white/30 text-sm mb-6">Featuring cast sourced from IMDB</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                    {castList.map((actor, idx) => (
                      <ActorCard
                        key={idx}
                        name={actor.name}
                        character={"character" in actor ? actor.character : undefined}
                        photoUrl={"photoUrl" in actor ? actor.photoUrl : undefined}
                      />
                    ))}
                  </div>
                  {/* Show OMDB writers/directors as crew if DB cast was used */}
                  {(meta?.directors?.length || meta?.writers?.length) && (
                    <div className="mt-10">
                      <h3 className="text-lg font-display font-bold text-white mb-5">Crew</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                        {meta?.directors?.map(name => (
                          <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/6">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <Clapperboard className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">{name}</p>
                              <p className="text-white/40 text-xs">Director</p>
                            </div>
                          </div>
                        ))}
                        {meta?.writers?.slice(0, 4).map(name => (
                          <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/6">
                            <div className="w-10 h-10 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                              <span className="text-white/60 text-lg">✍</span>
                            </div>
                            <div>
                              <p className="text-white font-semibold text-sm">{name}</p>
                              <p className="text-white/40 text-xs">Writer</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-white/40 py-12 text-center">Cast information not available.</p>
              )}
            </motion.div>
          )}

          {activeTab === "episodes" && hasEpisodes && (
            <motion.div key="episodes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <SeasonSelector episodes={content.episodes} onPlayEpisode={openPlayer} />
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
      {playerOpen && (
        <StreamPlayer
          imdbId={content.imdbId ?? undefined}
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
