import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-background border-t border-white/5 pt-16 pb-8 mt-20">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <span className="font-display font-black text-2xl text-white">Blasce<span className="text-primary">.</span></span>
            </Link>
            <p className="text-white/40 max-w-sm leading-relaxed text-sm">
              Your premium destination for cinematic experiences. Stream the world's best movies and TV shows, all in one place.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-6 text-sm uppercase tracking-wider">Browse</h4>
            <ul className="space-y-3 text-white/50 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/browse?type=movie" className="hover:text-white transition-colors">Movies</Link></li>
              <li><Link href="/browse?type=tv" className="hover:text-white transition-colors">TV Shows</Link></li>
              <li><Link href="/watchlist" className="hover:text-white transition-colors">My Watchlist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-6 text-sm uppercase tracking-wider">Account</h4>
            <ul className="space-y-3 text-white/50 text-sm">
              <li><Link href="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-xs">© {new Date().getFullYear()} Blasce. All rights reserved.</p>
          <p className="text-white/20 text-xs">Ratings sourced from IMDB and Rotten Tomatoes</p>
        </div>
      </div>
    </footer>
  );
}
