import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { useGetWatchlist, useAddToWatchlist, useRemoveFromWatchlist, getGetWatchlistQueryKey } from "@workspace/api-client-react";
import { getSessionId } from "@/lib/session";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
  contentId: number;
  className?: string;
  variant?: "icon" | "full";
}

export function WatchlistButton({ contentId, className, variant = "icon" }: WatchlistButtonProps) {
  const sessionId = getSessionId();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  const { data: watchlistData } = useGetWatchlist({ sessionId });
  const { mutate: addMutate, isPending: isAdding } = useAddToWatchlist();
  const { mutate: removeMutate, isPending: isRemoving } = useRemoveFromWatchlist();

  const isInWatchlist = watchlistData?.items?.some((item) => item.id === contentId) ?? false;
  const isPending = isAdding || isRemoving;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPending) return;

    if (isInWatchlist) {
      removeMutate(
        { contentId, params: { sessionId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetWatchlistQueryKey({ sessionId }) });
          }
        }
      );
    } else {
      addMutate(
        { data: { contentId, sessionId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetWatchlistQueryKey({ sessionId }) });
          }
        }
      );
    }
  };

  if (variant === "full") {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300",
          isInWatchlist 
            ? "bg-white/10 text-white hover:bg-white/20 hover:text-destructive" 
            : "bg-white/10 text-white hover:bg-white hover:text-black",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isPending ? (
          <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isInWatchlist ? (
          <Check className="w-5 h-5" />
        ) : (
          <Plus className="w-5 h-5" />
        )}
        {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-xl transition-all duration-300 hover:scale-110 active:scale-95",
        isInWatchlist ? "hover:bg-destructive/80 hover:border-destructive" : "hover:bg-white hover:text-black",
        className
      )}
    >
      {isPending ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin block" />
      ) : isInWatchlist ? (
        <Check className="w-5 h-5" />
      ) : (
        <Plus className="w-5 h-5" />
      )}
    </button>
  );
}
