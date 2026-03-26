import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-background border-t border-white/5 pt-16 pb-8 mt-20">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
               <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Blasce Logo" className="w-8 h-8" />
               <span className="font-display font-black text-2xl text-white">Blasce.</span>
            </div>
            <p className="text-white/50 max-w-sm leading-relaxed">
              Your premium destination for cinematic experiences. Stream the latest movies and trending TV shows in stunning quality.
            </p>
          </div>
          
          <div>
            <h4 className="font-display font-bold text-white mb-6">Navigation</h4>
            <ul className="space-y-4 text-white/60">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/browse?type=movie" className="hover:text-primary transition-colors">Movies</Link></li>
              <li><Link href="/browse?type=tv" className="hover:text-primary transition-colors">TV Shows</Link></li>
              <li><Link href="/watchlist" className="hover:text-primary transition-colors">My Watchlist</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-display font-bold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-white/60">
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cookie Preferences</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 text-center md:text-left text-white/40 text-sm flex flex-col md:flex-row items-center justify-between">
          <p>© {new Date().getFullYear()} Blasce Streaming. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex gap-4">
             <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">𝕏</span>
             <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">IG</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
