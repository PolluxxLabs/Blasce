import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, LogOut, Bookmark, ChevronDown, Settings, Film } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { SearchOverlay } from "@/components/ui/SearchOverlay";

export function Navbar() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 48);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setIsMobileMenuOpen(false); }, [location]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "/" && !isSearchOpen) { e.preventDefault(); setIsSearchOpen(true); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isSearchOpen]);

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Movies", path: "/browse?type=movie" },
    { label: "TV Shows", path: "/browse?type=tv" },
    { label: "Watchlist", path: "/watchlist" },
  ];

  const avatarSeed = user?.displayName ?? "guest_user";

  const isNavActive = (path: string) => {
    if (location === path) return true;
    if (!path.includes("?")) return false;
    const [basePath, qs] = path.split("?");
    if (location !== basePath) return false;
    const pp = new URLSearchParams(qs);
    const cp = new URLSearchParams(window.location.search);
    for (const [k, v] of pp.entries()) if (cp.get(k) !== v) return false;
    return true;
  };

  return (
    <>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500",
          isScrolled
            ? "bg-[hsl(0,0%,4%)]/92 backdrop-blur-xl border-b border-white/5 py-3 shadow-2xl shadow-black/60"
            : "bg-gradient-to-b from-black/80 to-transparent border-b border-transparent py-5"
        )}
      >
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-10">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_16px_hsl(38,90%,54%,0.5)] group-hover:shadow-[0_0_22px_hsl(38,90%,54%,0.7)] transition-shadow">
                <Film className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="font-display font-bold text-xl text-white tracking-tight group-hover:text-white/90 transition-opacity">
                Blasce
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const active = isNavActive(link.path);
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={cn(
                      "text-sm font-medium transition-all hover:text-white relative py-1",
                      active ? "text-white" : "text-white/50 hover:text-white/80"
                    )}
                  >
                    {link.label}
                    {active && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="group relative flex items-center gap-2 p-2 text-white/50 hover:text-white hover:bg-white/6 rounded-xl transition-all"
              aria-label="Search (press /)"
            >
              <Search className="w-4.5 h-4.5" />
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-white/25 bg-white/5 border border-white/8 rounded px-1.5 py-0.5 font-mono">/</span>
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-white/50 hover:text-white hover:bg-white/6 rounded-xl transition-all"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Auth — desktop */}
            {user ? (
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(s => !s)}
                  className="flex items-center gap-2 group pl-1.5"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-amber-300 p-[2px] shadow-[0_0_12px_hsl(38,90%,54%,0.4)] transition-shadow group-hover:shadow-[0_0_18px_hsl(38,90%,54%,0.6)]">
                    <div className="w-full h-full bg-background rounded-full flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=transparent`}
                        alt={user.displayName}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform duration-200", isUserMenuOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 mt-3 w-56 bg-[hsl(0,0%,8%)]/98 backdrop-blur-xl border border-white/8 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden"
                    >
                      <div className="px-4 py-4 border-b border-white/6 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-amber-300 p-[2px] flex-shrink-0">
                          <div className="w-full h-full bg-background rounded-full overflow-hidden">
                            <img
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=transparent`}
                              alt={user.displayName}
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{user.displayName}</p>
                          <p className="text-white/35 text-xs truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="py-1.5">
                        <Link
                          href="/watchlist"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-white/55 hover:text-white hover:bg-white/5 transition-colors text-sm"
                        >
                          <Bookmark className="w-4 h-4" />
                          My Watchlist
                        </Link>
                        <Link
                          href="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-white/55 hover:text-white hover:bg-white/5 transition-colors text-sm"
                        >
                          <Settings className="w-4 h-4" />
                          Account Settings
                        </Link>
                      </div>

                      <div className="border-t border-white/6 py-1.5">
                        <button
                          onClick={() => { logout(); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors text-sm"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1">
                <Link
                  href="/login"
                  className="px-4 py-2 text-white/55 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-black text-sm font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_16px_hsl(38,90%,54%,0.35)]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.32 }}
            className="fixed inset-0 z-[100] bg-[hsl(0,0%,5%)]/98 backdrop-blur-3xl md:hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                  <Film className="w-3 h-3 text-black" />
                </div>
                <span className="font-display font-bold text-lg text-white">Blasce</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-white/50 hover:text-white bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col p-6 gap-1 flex-grow overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className="text-xl font-display font-bold text-white/65 hover:text-white px-4 py-3.5 rounded-xl hover:bg-white/5 transition-all"
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => { setIsMobileMenuOpen(false); setIsSearchOpen(true); }}
                className="text-xl font-display font-bold text-white/65 hover:text-white px-4 py-3.5 rounded-xl hover:bg-white/5 transition-all text-left flex items-center gap-3"
              >
                <Search className="w-5 h-5" />
                Search
              </button>

              {!user && (
                <div className="mt-6 flex flex-col gap-3 px-4">
                  <Link href="/login" className="text-center py-3.5 font-bold text-white/70 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                    Sign In
                  </Link>
                  <Link href="/signup" className="text-center py-3.5 font-bold text-black bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-[0_0_20px_hsl(38,90%,54%,0.35)]">
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>

            {user && (
              <div className="p-5 border-t border-white/6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-amber-300 p-[2px]">
                    <div className="w-full h-full bg-background rounded-full overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`} alt="Avatar" className="w-full h-full" />
                    </div>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{user.displayName}</div>
                    <div className="text-white/35 text-xs">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/8 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
