import { Link } from "wouter";
import { Film } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="relative mb-8">
        <Film className="w-32 h-32 text-white/10" />
        <div className="absolute inset-0 flex items-center justify-center font-display font-black text-6xl text-primary mix-blend-overlay">
          404
        </div>
      </div>
      <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
        Lost in the Multiverse?
      </h1>
      <p className="text-white/50 text-lg mb-10 max-w-md">
        The page you're looking for doesn't exist, was removed, or is temporarily unavailable.
      </p>
      <Link 
        href="/"
        className="px-8 py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-slate-200 transition-all hover:scale-105"
      >
        Return Home
      </Link>
    </div>
  );
}
