import { useQuery } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API_BASE = BASE_URL ? `${BASE_URL}/api` : "/api";

export interface MetaData {
  imdbId: string;
  title: string;
  year: string;
  rated: string;
  released: string;
  runtime: string;
  genres: string[];
  directors: string[];
  writers: string[];
  actors: string[];
  plot: string;
  language: string;
  country: string;
  awards: string;
  poster: string;
  boxOffice: string;
  type: string;
  imdbRating: number;
  imdbVotes: string;
  rtScore: number;
  metacritic: number;
  imdbUrl: string;
  rtSearchUrl: string;
}

async function fetchMeta(imdbId: string): Promise<MetaData> {
  const res = await fetch(`${API_BASE}/meta?imdb=${imdbId}`);
  if (!res.ok) throw new Error("meta fetch failed");
  return res.json();
}

export function useMeta(imdbId?: string | null) {
  return useQuery<MetaData>({
    queryKey: ["meta", imdbId],
    queryFn: () => fetchMeta(imdbId!),
    enabled: !!imdbId,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
