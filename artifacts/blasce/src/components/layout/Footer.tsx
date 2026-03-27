import { Link } from "wouter";
import { Film, Github, Twitter } from "lucide-react";

const GENRE_LINKS = [
  { label: "Action", slug: "action" },
  { label: "Drama", slug: "drama" },
  { label: "Comedy", slug: "comedy" },
  { label: "Sci-Fi", slug: "sci-fi" },
  { label: "Horror", slug: "horror" },
  { label: "Animation", slug: "animation" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 mt-24">
      {/* Top gradient line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-5 group">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Film className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="font-display font-bold text-xl text-white">Blasce</span>
            </Link>
            <p className="text-white/35 max-w-xs leading-relaxed text-sm mb-6">
              Your destination for cinematic experiences. Unlimited streaming with no ads, ever.
            </p>
            <div className="flex items-center gap-2">
              <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/6 flex items-center justify-center text-white/40 hover:text-white transition-all">
                <Twitter className="w-3.5 h-3.5" />
              </a>
              <a href="#" aria-label="GitHub" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/6 flex items-center justify-center text-white/40 hover:text-white transition-all">
                <Github className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Browse */}
          <div>
            <h4 className="text-white/80 font-semibold text-xs uppercase tracking-widest mb-5">Browse</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="text-white/40 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/browse?type=movie" className="text-white/40 hover:text-white transition-colors">Movies</Link></li>
              <li><Link href="/browse?type=tv" className="text-white/40 hover:text-white transition-colors">TV Shows</Link></li>
              <li><Link href="/watchlist" className="text-white/40 hover:text-white transition-colors">My Watchlist</Link></li>
            </ul>
          </div>

          {/* Genres */}
          <div>
            <h4 className="text-white/80 font-semibold text-xs uppercase tracking-widest mb-5">Genres</h4>
            <ul className="space-y-3 text-sm">
              {GENRE_LINKS.map(g => (
                <li key={g.slug}>
                  <Link href={`/browse?genre=${g.slug}`} className="text-white/40 hover:text-white transition-colors">
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white/80 font-semibold text-xs uppercase tracking-widest mb-5">Account</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/signup" className="text-white/40 hover:text-white transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="text-white/40 hover:text-white transition-colors">Sign In</Link></li>
              <li><a href="#" className="text-white/40 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-white/40 hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} Blasce. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-white/15 text-xs">Ratings via IMDb & Rotten Tomatoes</span>
            <span className="text-white/15 text-xs">Content data via TMDB</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
