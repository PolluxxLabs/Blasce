import { Link, useLocation } from "wouter";
import { Check, Plus, LogIn } from "lucide-react";
import { useWatchlistToggle } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
  contentId: number;
  className?: string;
  variant?: "icon" | "full";
}

export function WatchlistButton({ contentId, className, variant = "icon" }: WatchlistButtonProps) {
  const { isIn, isLoggedIn, isPending, toggle } = useWatchlistToggle(contentId);
  const [, navigate] = useLocation();

  const goToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/login");
  };

  // ── Not logged in ──────────────────────────────────────────────────
  if (!isLoggedIn) {
    if (variant === "full") {
      return (
        <Link
          href="/login"
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all hover:scale-105 active:scale-95",
            className,
          )}
        >
          <LogIn className="w-5 h-5" />
          Sign in to Save
        </Link>
      );
    }
    // Icon variant: use button + programmatic nav to avoid nested <a>
    return (
      <button
        onClick={goToLogin}
        title="Sign in to save"
        className={cn(
          "p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-xl transition-all duration-300 hover:scale-110 hover:bg-white/20",
          className,
        )}
      >
        <LogIn className="w-5 h-5" />
      </button>
    );
  }

  // ── Logged in ──────────────────────────────────────────────────────
  if (variant === "full") {
    return (
      <button
        onClick={toggle}
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300",
          isIn
            ? "bg-white/10 text-white hover:bg-white/20 hover:text-destructive"
            : "bg-white/10 text-white hover:bg-white hover:text-black",
          className,
        )}
      >
        {isPending ? (
          <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isIn ? (
          <Check className="w-5 h-5" />
        ) : (
          <Plus className="w-5 h-5" />
        )}
        {isIn ? "In Watchlist" : "Add to Watchlist"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={cn(
        "p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-xl transition-all duration-300 hover:scale-110 active:scale-95",
        isIn ? "hover:bg-destructive/80 hover:border-destructive" : "hover:bg-white hover:text-black",
        className,
      )}
    >
      {isPending ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin block" />
      ) : isIn ? (
        <Check className="w-5 h-5" />
      ) : (
        <Plus className="w-5 h-5" />
      )}
    </button>
  );
}
