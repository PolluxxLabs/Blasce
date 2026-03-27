import { Link } from "wouter";
import { BookmarkX, Compass, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useWatchlistItems } from "@/hooks/useWatchlist";
import { ContentCard } from "@/components/content/ContentCard";
import { SkeletonGrid } from "@/components/ui/SkeletonCard";

export default function Watchlist() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useWatchlistItems();

  const count = data?.length ?? 0;

  // ── Unauthenticated state ──────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-24">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl md:text-5xl font-display font-black text-white mb-2"
          >
            My Watchlist
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-white/40 text-base mb-16"
          >
            Sign in to save and manage your watchlist
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-full bg-white/3 border border-white/8 flex items-center justify-center">
                <LogIn className="w-14 h-14 text-white/15" />
              </div>
              <div className="absolute -inset-4 rounded-full bg-primary/5 blur-2xl" />
            </div>

            <h3 className="text-3xl font-display font-bold text-white mb-3">Sign in to save titles</h3>
            <p className="text-white/40 max-w-sm text-base leading-relaxed mb-8">
              Create a free account to build your personal watchlist and keep track of what you want to watch.
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/signup"
                className="flex items-center gap-2 px-7 py-3.5 bg-primary hover:bg-primary/90 text-black rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_24px_hsl(38,90%,54%,0.3)]"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold border border-white/10 transition-all hover:scale-105 active:scale-95"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Authenticated state ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-28 pb-24">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        {/* Page header */}
        <div className="mb-10">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl md:text-5xl font-display font-black text-white mb-2"
          >
            My Watchlist
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-white/40 text-base"
          >
            {isLoading
              ? "Loading your saved titles..."
              : count > 0
              ? `${count} saved title${count !== 1 ? "s" : ""}`
              : "Movies and shows you want to watch"}
          </motion.p>
        </div>

        {isLoading ? (
          <SkeletonGrid count={12} />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
              <BookmarkX className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Failed to load watchlist</h3>
            <p className="text-white/40 text-sm">Please try refreshing the page.</p>
          </div>
        ) : count > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5"
          >
            {data!.map((item, index) => (
              <ContentCard key={item.id} content={item as any} index={index % 12} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-full bg-white/3 border border-white/8 flex items-center justify-center">
                <BookmarkX className="w-14 h-14 text-white/15" />
              </div>
              <div className="absolute -inset-4 rounded-full bg-primary/5 blur-2xl" />
            </div>

            <h3 className="text-3xl font-display font-bold text-white mb-3">Nothing saved yet</h3>
            <p className="text-white/40 max-w-sm text-base leading-relaxed mb-8">
              Browse movies and TV shows and tap the bookmark icon to save them here for later.
            </p>

            <Link
              href="/browse"
              className="flex items-center gap-2 px-7 py-3.5 bg-primary hover:bg-primary/90 text-black rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_24px_hsl(38,90%,54%,0.3)]"
            >
              <Compass className="w-5 h-5" />
              Explore Content
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
