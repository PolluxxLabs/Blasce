import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Play, Star, Calendar, Clock, Tv, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { StreamPlayer } from "@/components/content/StreamPlayer";
import { formatDuration } from "@/lib/utils";
import {
  getMovie, getTv, getSeason,
  tmdbPoster, tmdbBackdrop,
  type TMDBMovie, type TMDBTv, type TMDBEpisode,
} from "@/lib/tmdb";

function EpisodeList({
  tvId,
  seasons,
  imdbId,
  title,
  onPlay,
}: {
  tvId: number;
  seasons: { season_number: number; episode_count: number }[];
  imdbId: string;
  title: string;
  onPlay: (season: number, episode: number) => void;
}) {
  const [openSeason, setOpenSeason] = useState(1);

  const { data: seasonData, isLoading } = useQuery({
    queryKey: ["tmdb-season", tvId, openSeason],
    queryFn: () => getSeason(tvId, openSeason),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="space-y-3 max-w-4xl">
      {seasons.map(s => {
        const isOpen = openSeason === s.season_number;
        return (
          <div key={s.season_number} className="border border-white/8 rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenSeason(isOpen ? -1 : s.season_number)}
              className="w-full flex items-center justify-between px-6 py-4 bg-secondary/20 hover:bg-secondary/40 transition-colors text-left"
            >
              <span className="font-display font-bold text-white text-lg">Season {s.season_number}</span>
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-sm">{s.episode_count} episodes</span>
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
                  {isLoading ? (
                    <div className="px-6 py-8 text-white/30 text-sm text-center">Loading episodes...</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {(seasonData?.episodes ?? []).map((ep: TMDBEpisode) => (
                        <div
                          key={ep.id}
                          onClick={() => onPlay(s.season_number, ep.episode_number)}
                          className="flex items-start gap-5 px-6 py-4 hover:bg-white/5 transition-colors group cursor-pointer"
                        >
                          <div className="w-32 sm:w-44 aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-secondary/50 relative">
                            {ep.still_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                alt={ep.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-primary/40 flex items-center justify-center transition-colors">
                                  <Play className="w-5 h-5 fill-white text-white pl-0.5" />
                                </div>
                              </div>
                            )}
                            {ep.still_path && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                <Play className="w-8 h-8 fill-white text-white" />
                              </div>
                            )}
                            {ep.runtime != null && (
                              <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                                {formatDuration(ep.runtime)}
                              </div>
                            )}
                          </div>
                          <div className="flex-grow pt-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-primary text-xs font-bold font-mono">E{ep.episode_number}</span>
                              <h4 className="text-white font-semibold text-sm truncate group-hover:text-primary/90 transition-colors">{ep.name}</h4>
                            </div>
                            {ep.overview && (
                              <p className="text-white/50 text-xs leading-relaxed line-clamp-2">{ep.overview}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function WatchMovie({ id }: { id: number }) {
  const [playerOpen, setPlayerOpen] = useState(false);

  const { data: movie, isLoading, isError } = useQuery<TMDBMovie>({
    queryKey: ["tmdb-movie", id],
    queryFn: () => getMovie(id),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) return <FullPageLoader />;
  if (isError || !movie) return <NotFoundState />;

  const poster = tmdbPoster(movie.poster_path);
  const backdrop = tmdbBackdrop(movie.backdrop_path);
  const year = movie.release_date?.slice(0, 4);
  const canStream = !!movie.imdb_id;

  return (
    <WatchLayout
      title={movie.title}
      poster={poster}
      backdrop={backdrop}
      year={year}
      score={movie.vote_average}
      duration={movie.runtime}
      genres={movie.genres.map(g => g.name)}
      overview={movie.overview}
      cast={movie.credits?.cast?.slice(0, 12)}
      canStream={canStream}
      watchButton={
        canStream ? (
          <button
            onClick={() => setPlayerOpen(true)}
            className="flex items-center gap-2.5 px-6 py-3 bg-primary text-white rounded-xl font-bold text-base hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/30"
          >
            <Play className="w-5 h-5 fill-current" />
            Watch Now
          </button>
        ) : null
      }
    >
      {playerOpen && movie.imdb_id && (
        <StreamPlayer
          imdbId={movie.imdb_id}
          title={movie.title}
          type="movie"
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </WatchLayout>
  );
}

function WatchTv({ id }: { id: number }) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerSeason, setPlayerSeason] = useState<number | undefined>();
  const [playerEpisode, setPlayerEpisode] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState<"overview" | "episodes" | "cast">("overview");

  const { data: tv, isLoading, isError } = useQuery<TMDBTv>({
    queryKey: ["tmdb-tv", id],
    queryFn: () => getTv(id),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) return <FullPageLoader />;
  if (isError || !tv) return <NotFoundState />;

  const poster = tmdbPoster(tv.poster_path);
  const backdrop = tmdbBackdrop(tv.backdrop_path);
  const year = tv.first_air_date?.slice(0, 4);
  const canStream = !!tv.imdb_id;

  const onPlay = (season: number, episode: number) => {
    setPlayerSeason(season);
    setPlayerEpisode(episode);
    setPlayerOpen(true);
  };

  const tabs: Array<"overview" | "cast" | "episodes"> =
    tv.seasons?.length > 0 ? ["overview", "cast", "episodes"] : ["overview", "cast"];

  return (
    <WatchLayout
      title={tv.name}
      poster={poster}
      backdrop={backdrop}
      year={year}
      score={tv.vote_average}
      seasons={tv.number_of_seasons}
      totalEpisodes={tv.number_of_episodes}
      genres={tv.genres.map(g => g.name)}
      overview={tv.overview}
      cast={tv.credits?.cast?.slice(0, 12)}
      canStream={canStream}
      isTv
      watchButton={
        canStream ? (
          <button
            onClick={() => onPlay(1, 1)}
            className="flex items-center gap-2.5 px-6 py-3 bg-primary text-white rounded-xl font-bold text-base hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/30"
          >
            <Play className="w-5 h-5 fill-current" />
            Watch S01 E01
          </button>
        ) : null
      }
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      episodePanel={
        tv.imdb_id && tv.seasons?.length > 0 ? (
          <EpisodeList
            tvId={id}
            seasons={tv.seasons}
            imdbId={tv.imdb_id}
            title={tv.name}
            onPlay={onPlay}
          />
        ) : null
      }
    >
      {playerOpen && tv.imdb_id && (
        <StreamPlayer
          imdbId={tv.imdb_id}
          title={tv.name}
          type="tv"
          season={playerSeason}
          episode={playerEpisode}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </WatchLayout>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-white mb-4">Not Found</h1>
        <p className="text-white/50">This title could not be found.</p>
      </div>
    </div>
  );
}

interface WatchLayoutProps {
  title: string;
  poster: string | null;
  backdrop: string | null;
  year?: string;
  score?: number;
  duration?: number | null;
  seasons?: number;
  totalEpisodes?: number;
  genres: string[];
  overview: string;
  cast?: { id: number; name: string; character: string; profile_path?: string | null }[];
  canStream: boolean;
  isTv?: boolean;
  watchButton: React.ReactNode;
  tabs?: Array<"overview" | "cast" | "episodes">;
  activeTab?: "overview" | "cast" | "episodes";
  onTabChange?: (tab: "overview" | "cast" | "episodes") => void;
  episodePanel?: React.ReactNode;
  children?: React.ReactNode;
}

function WatchLayout({
  title, poster, backdrop, year, score, duration, seasons, totalEpisodes,
  genres, overview, cast, isTv, watchButton,
  tabs = ["overview", "cast"],
  activeTab: externalTab,
  onTabChange,
  episodePanel,
  children,
}: WatchLayoutProps) {
  const [internalTab, setInternalTab] = useState<"overview" | "cast" | "episodes">("overview");
  const activeTab = externalTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Backdrop */}
      <div className="relative w-full h-[55vh] md:h-[75vh]">
        <div className="absolute inset-0">
          <img
            src={backdrop || `${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 w-full translate-y-1/3 md:translate-y-1/4">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-6 md:gap-10 items-end">
            {poster && (
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", damping: 20 }}
                className="hidden sm:block w-40 md:w-60 lg:w-72 flex-shrink-0 relative z-20"
              >
                <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.8)] border border-white/8">
                  <img src={poster} alt="Poster" className="w-full h-full object-cover" />
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex-grow pb-6 md:pb-10 relative z-20 min-w-0"
            >
              <div className="flex flex-wrap gap-2 mb-3">
                {genres.slice(0, 4).map(g => (
                  <span key={g} className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-white/8 text-white/60 rounded-md border border-white/8">
                    {g}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black text-white mb-4 leading-tight drop-shadow-lg">
                {title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mb-7">
                {score != null && score > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/25 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-sm">{score.toFixed(1)}</span>
                    <span className="text-white/35 text-xs">TMDB</span>
                  </div>
                )}
                {year && (
                  <span className="flex items-center gap-1.5 text-white/50 text-sm">
                    <Calendar className="w-4 h-4" />
                    {year}
                  </span>
                )}
                {!isTv && duration != null && (
                  <span className="flex items-center gap-1.5 text-white/50 text-sm">
                    <Clock className="w-4 h-4" />
                    {formatDuration(duration)}
                  </span>
                )}
                {isTv && seasons != null && (
                  <span className="flex items-center gap-1.5 text-white/50 text-sm">
                    <Tv className="w-4 h-4" />
                    {seasons} Season{seasons !== 1 ? "s" : ""}
                    {totalEpisodes ? ` · ${totalEpisodes} eps` : ""}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                {watchButton}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-48 md:mt-36 lg:mt-32">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/8 mb-10 overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={`pb-4 text-base font-display font-semibold capitalize tracking-wide whitespace-nowrap relative transition-colors ${
                activeTab === tab ? "text-white" : "text-white/35 hover:text-white/65"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div layoutId="watch-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-display font-bold text-white mb-4">Storyline</h3>
                  <p className="text-white/65 leading-relaxed text-base max-w-3xl">{overview || "No description available."}</p>
                </div>
                <div>
                  <div className="p-6 rounded-2xl bg-white/3 border border-white/8">
                    <h4 className="font-display font-bold text-white mb-5 text-sm uppercase tracking-wider border-b border-white/8 pb-4">Details</h4>
                    <dl className="space-y-4 text-sm">
                      {genres.length > 0 && (
                        <div>
                          <dt className="text-white/35 mb-1.5">Genres</dt>
                          <dd className="flex flex-wrap gap-1.5">
                            {genres.map(g => (
                              <span key={g} className="px-2.5 py-1 bg-white/6 rounded-lg text-white/80 text-xs border border-white/8">{g}</span>
                            ))}
                          </dd>
                        </div>
                      )}
                      {year && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">Year</dt>
                          <dd className="text-white/80">{year}</dd>
                        </div>
                      )}
                      {!isTv && duration != null && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">Runtime</dt>
                          <dd className="text-white/80">{formatDuration(duration)}</dd>
                        </div>
                      )}
                      {isTv && seasons != null && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">Seasons</dt>
                          <dd className="text-white/80">{seasons}</dd>
                        </div>
                      )}
                      {score != null && score > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-white/35">TMDB Score</dt>
                          <dd className="text-yellow-400 font-bold">{score.toFixed(1)} / 10</dd>
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
              {cast && cast.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                  {cast.map(actor => (
                    <div key={actor.id} className="group">
                      <div className="aspect-square rounded-2xl overflow-hidden bg-secondary mb-3 relative">
                        <img
                          src={
                            actor.profile_path
                              ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(actor.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`
                          }
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

          {activeTab === "episodes" && episodePanel && (
            <motion.div key="episodes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {episodePanel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {children}
    </div>
  );
}

export default function Watch() {
  const [, movieParams] = useRoute("/watch/movie/:id");
  const [, tvParams] = useRoute("/watch/tv/:id");

  if (movieParams?.id) {
    const id = parseInt(movieParams.id, 10);
    if (!isNaN(id)) return <WatchMovie id={id} />;
  }

  if (tvParams?.id) {
    const id = parseInt(tvParams.id, 10);
    if (!isNaN(id)) return <WatchTv id={id} />;
  }

  return <NotFoundState />;
}
