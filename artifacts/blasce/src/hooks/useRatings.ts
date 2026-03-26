import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API = BASE ? `${BASE}/api` : "/api";

export interface Ratings {
  imdbId: string;
  imdbRating: number;
  imdbVotes: string;
  rtScore: number;
  metacritic: number;
  imdbUrl: string;
  rtSearchUrl: string;
}

export function useRatings(imdbId?: string | null) {
  return useQuery<Ratings>({
    queryKey: ["ratings", imdbId],
    queryFn: async () => {
      const res = await fetch(`${API}/ratings?imdb=${imdbId}`);
      if (!res.ok) throw new Error("ratings unavailable");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data as Ratings;
    },
    enabled: !!imdbId,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
