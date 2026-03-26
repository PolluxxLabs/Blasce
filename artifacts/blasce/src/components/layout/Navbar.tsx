import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, LogOut, Bookmark, ChevronDown } from "lucide-react";
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
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Movies", path: "/browse?type=movie" },
    { label: "TV Shows", path: "/browse?type=tv" },
    { label: "Watchlist", path: "/watchlist" },
  ];

  const avatarSeed = user?.displayName ?? "guest_user";

  const isNavActive = (path: string) =>
    location === path ||
    (path.includes("?") && location.startsWith(path.split("?")[0]) && path.includes(location));

  return (
    <>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b",
          isScrolled
            ? "bg-background/85 backdrop-blur-xl border-white/6 py-3 shadow-xl shadow-black/30"
            : "bg-gradient-to-b from-black/70 to-transparent border-transparent py-5"
        )}
      >
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
          {/* Logo + Nav */}
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center group flex-shrink-0">
              <span className="font-display font-black text-2xl md:text-3xl tracking-tight text-white transition-opacity group-hover:opacity-80">
                Blasce<span className="text-primary">.</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-7">
              {navLinks.map((link) => {
                const active = isNavActive(link.path);
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={cn(
                      "text-sm font-semibold transition-colors hover:text-white relative py-1",
                      active ? "text-white" : "text-white/55"
                    )}
                  >
                    {link.label}
                    {active && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/8 rounded-full transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-white/60 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Auth area — desktop only */}
            {user ? (
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(s => !s)}
                  className="flex items-center gap-2 group pl-2"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] transition-transform group-hover:scale-105">
                    <div className="w-full h-full bg-background rounded-full flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=transparent`}
                        alt={user.displayName}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-white/40 transition-transform", isUserMenuOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-56 bg-background/97 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
                    >
                      {/* User info */}
                      <div className="px-4 py-4 border-b border-white/8 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] flex-shrink-0">
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

                      {/* Menu items */}
                      <div className="py-1">
                        <Link
                          href="/watchlist"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-white/65 hover:text-white hover:bg-white/5 transition-colors text-sm"
                        >
                          <Bookmark className="w-4 h-4" />
                          My Watchlist
                        </Link>
                      </div>

                      <div className="border-t border-white/8 py-1">
                        <button
                          onClick={() => { logout(); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400/80 hover:text-red-400 hover:bg-red-500/5 transition-colors text-sm"
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
                  className="px-4 py-2 text-white/65 hover:text-white text-sm font-semibold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-all hover:scale-105 active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile slide-in menu ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-3xl md:hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <span className="font-display font-black text-xl text-white">Blasce<span className="text-primary">.</span></span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-white/60 hover:text-white bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col p-6 gap-1 flex-grow overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className="text-xl font-display font-bold text-white/75 hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition-all"
                >
                  {link.label}
                </Link>
              ))}

              {/* Search shortcut */}
              <button
                onClick={() => { setIsMobileMenuOpen(false); setIsSearchOpen(true); }}
                className="text-xl font-display font-bold text-white/75 hover:text-white px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-left flex items-center gap-3"
              >
                <Search className="w-5 h-5" />
                Search
              </button>

              {!user && (
                <div className="mt-4 flex flex-col gap-3 px-4">
                  <Link href="/login" className="text-center py-3 font-bold text-white/70 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                    Sign In
                  </Link>
                  <Link href="/signup" className="text-center py-3 font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors">
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>

            {user && (
              <div className="p-5 border-t border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
                    <div className="w-full h-full bg-background rounded-full overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`} alt="Avatar" className="w-full h-full" />
                    </div>
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{user.displayName}</div>
                    <div className="text-white/40 text-xs">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-500/8 rounded-xl transition-colors"
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
