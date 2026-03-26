const API_KEY = "8265bd1679663a7ea12ac168da84d2e8";
const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

export function tmdbPoster(path: string | null | undefined, size = "w500"): string | null {
  return path ? `${IMG}/${size}${path}` : null;
}

export function tmdbBackdrop(path: string | null | undefined, size = "w1280"): string | null {
  return path ? `${IMG}/${size}${path}` : null;
}

async function get<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}api_key=${API_KEY}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export interface TMDBSearchResult {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCast {
  id: number;
  name: string;
  character: string;
  profile_path?: string | null;
}

export interface TMDBCrew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path?: string | null;
}

export interface TMDBKeyword {
  id: number;
  name: string;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  runtime?: number | null;
  still_path?: string | null;
  air_date?: string;
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path?: string | null;
  air_date?: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  tagline?: string;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date: string;
  vote_average: number;
  vote_count?: number;
  runtime?: number | null;
  budget?: number;
  revenue?: number;
  status?: string;
  original_language?: string;
  genres: TMDBGenre[];
  credits: { cast: TMDBCast[]; crew: TMDBCrew[] };
  keywords?: { keywords: TMDBKeyword[] };
  imdb_id?: string | null;
  production_countries?: { iso_3166_1: string; name: string }[];
}

export interface TMDBTv {
  id: number;
  name: string;
  tagline?: string;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date: string;
  last_air_date?: string;
  vote_average: number;
  vote_count?: number;
  number_of_seasons: number;
  number_of_episodes: number;
  status?: string;
  original_language?: string;
  seasons: TMDBSeason[];
  genres: TMDBGenre[];
  credits: { cast: TMDBCast[]; crew: TMDBCrew[] };
  keywords?: { results: TMDBKeyword[] };
  created_by?: { id: number; name: string; profile_path?: string | null }[];
  networks?: { id: number; name: string; logo_path?: string | null }[];
  imdb_id?: string | null;
}

export interface TMDBSeasonDetail {
  season_number: number;
  name: string;
  episodes: TMDBEpisode[];
}

export function getDirectors(crew: TMDBCrew[]): string[] {
  return crew.filter(c => c.job === "Director").map(c => c.name);
}

export function getWriters(crew: TMDBCrew[]): string[] {
  return crew
    .filter(c => ["Writer", "Screenplay", "Story"].includes(c.job))
    .slice(0, 3)
    .map(c => c.name);
}

export function formatBudget(n: number | undefined): string | null {
  if (!n || n === 0) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export async function searchTmdb(query: string): Promise<TMDBSearchResult[]> {
  const data = await get<{ results: (TMDBSearchResult & { media_type: string })[] }>(
    `/search/multi?query=${encodeURIComponent(query)}&include_adult=false&page=1`
  );
  return data.results.filter(r => r.media_type === "movie" || r.media_type === "tv") as TMDBSearchResult[];
}

export async function getMovie(id: number): Promise<TMDBMovie> {
  const [movie, ext] = await Promise.all([
    get<TMDBMovie>(`/movie/${id}?append_to_response=credits,keywords`),
    get<{ imdb_id?: string }>(`/movie/${id}/external_ids`),
  ]);
  return { ...movie, imdb_id: ext.imdb_id };
}

export async function getTv(id: number): Promise<TMDBTv> {
  const [tv, ext] = await Promise.all([
    get<TMDBTv>(`/tv/${id}?append_to_response=credits,keywords`),
    get<{ imdb_id?: string }>(`/tv/${id}/external_ids`),
  ]);
  const realSeasons = (tv.seasons ?? []).filter(s => s.season_number > 0);
  return { ...tv, seasons: realSeasons, imdb_id: ext.imdb_id };
}

export async function getSeason(tvId: number, season: number): Promise<TMDBSeasonDetail> {
  return get<TMDBSeasonDetail>(`/tv/${tvId}/season/${season}`);
}
