import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const API = BASE ? `${BASE}/api` : "/api";

export interface DirectSource {
  quality: string;
  url: string;
  type: "mp4" | "hls" | string;
}

export interface ScraperResult {
  id: string;
  sources: DirectSource[];
  audioTracks: { language: string; slug: string }[];
  season?: number;
  episode?: number;
}

async function searchAndFetchSources(
  title: string,
  season?: number,
  episode?: number,
): Promise<ScraperResult> {
  const searchRes = await fetch(
    `${API}/scraper/search?q=${encodeURIComponent(title)}&limit=3`,
  );
  if (!searchRes.ok) throw new Error("scraper search unavailable");
  const searchData = await searchRes.json();
  const results: { id: string; title: string }[] = searchData.results ?? [];
  if (!results.length) return { id: "", sources: [], audioTracks: [] };

  const best = results[0];
  let sourcesUrl = `${API}/scraper/sources/${encodeURIComponent(best.id)}`;
  const params: string[] = [];
  if (season != null) params.push(`season=${season}`);
  if (episode != null) params.push(`episode=${episode}`);
  if (params.length) sourcesUrl += `?${params.join("&")}`;

  const sourcesRes = await fetch(sourcesUrl);
  if (!sourcesRes.ok) throw new Error("scraper sources unavailable");
  return sourcesRes.json() as Promise<ScraperResult>;
}

export function useDirectSources(
  title?: string | null,
  season?: number,
  episode?: number,
  enabled = true,
) {
  return useQuery<ScraperResult>({
    queryKey: ["direct-sources", title, season, episode],
    queryFn: () => searchAndFetchSources(title!, season, episode),
    enabled: enabled && !!title,
    staleTime: 30 * 60 * 1000,
    retry: 1,
    gcTime: 60 * 60 * 1000,
  });
}
