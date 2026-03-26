import { useGetWatchlist } from "@workspace/api-client-react";
import { getSessionId } from "@/lib/session";
import { ContentCard } from "@/components/content/ContentCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Link } from "wouter";

export default function Watchlist() {
  const sessionId = getSessionId();
  const { data, isLoading, isError } = useGetWatchlist({ sessionId });

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-4 md:px-8 max-w-[1600px] mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4">My Watchlist</h1>
        <p className="text-white/50 text-lg">
          {data?.items ? `You have ${data.items.length} items saved` : 'Movies and shows you want to watch'}
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-32" />
      ) : isError ? (
        <div className="py-32 text-center text-destructive">Failed to load watchlist. Please try again.</div>
      ) : data?.items && data.items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {data.items.map((item, index) => (
            <ContentCard key={item.id} content={item} index={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-secondary/20 rounded-3xl border border-white/5">
          <img 
            src={`${import.meta.env.BASE_URL}images/empty-state.png`} 
            alt="Empty Watchlist" 
            className="w-64 h-64 mb-8 opacity-80 mix-blend-screen"
          />
          <h3 className="text-3xl font-display font-bold text-white mb-4">Your watchlist is empty</h3>
          <p className="text-white/50 max-w-md text-lg mb-8">
            Start adding movies and TV shows to keep track of what you want to watch next.
          </p>
          <Link 
            href="/browse"
            className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:shadow-[0_0_50px_rgba(var(--primary),0.5)] hover:-translate-y-1"
          >
            Explore Content
          </Link>
        </div>
      )}
    </div>
  );
}
