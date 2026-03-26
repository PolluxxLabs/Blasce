import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("blasce_token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export interface WatchlistContent {
  id: number;
  title: string;
  type: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseYear: number;
  rating: string;
  imdbScore?: number;
  rtScore?: number;
  duration?: number;
  seasons?: number;
  totalEpisodes?: number;
  genres?: string[];
}

export const WATCHLIST_KEY = ["watchlist"] as const;

// ── Fetch the current user's watchlist ────────────────────────────────
export function useWatchlistItems() {
  const { user } = useAuth();

  return useQuery<WatchlistContent[]>({
    queryKey: [...WATCHLIST_KEY, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/watchlist`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch watchlist");
      const data = await res.json();
      return data.items ?? [];
    },
  });
}

// ── Check if a specific item is in the watchlist ──────────────────────
export function useIsInWatchlist(contentId: number) {
  const { data } = useWatchlistItems();
  return (data ?? []).some((item) => item.id === contentId);
}

// ── Toggle watchlist membership ───────────────────────────────────────
export function useWatchlistToggle(contentId: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isIn = useIsInWatchlist(contentId);

  const add = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/watchlist`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ contentId }),
      });
      if (!res.ok) throw new Error("Failed to add to watchlist");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WATCHLIST_KEY }),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/watchlist/${contentId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to remove from watchlist");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WATCHLIST_KEY }),
  });

  const toggle = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (isIn) remove.mutate();
      else add.mutate();
    },
    [isIn, add, remove],
  );

  return {
    isIn,
    isLoggedIn: !!user,
    isPending: add.isPending || remove.isPending,
    toggle,
  };
}
