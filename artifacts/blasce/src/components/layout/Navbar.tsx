import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
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

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Movies", path: "/browse?type=movie" },
    { label: "TV Shows", path: "/browse?type=tv" },
    { label: "Watchlist", path: "/watchlist" },
  ];

  const avatarSeed = user?.displayName ?? "guest_user";

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b border-transparent",
          isScrolled
            ? "bg-background/80 backdrop-blur-xl border-white/5 py-4 shadow-lg"
            : "bg-gradient-to-b from-black/80 to-transparent py-6"
        )}
      >
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center group">
              <span className="font-display font-black text-2xl md:text-3xl tracking-tight text-white transition-opacity group-hover:opacity-80">
                Blasce<span className="text-primary">.</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive =
                  location === link.path ||
                  (link.path.includes("?") && location.startsWith(link.path.split("?")[0]));
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={cn(
                      "text-sm font-semibold transition-colors hover:text-white relative py-2",
                      isActive ? "text-white" : "text-white/60"
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/browse"
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <Search className="w-5 h-5" />
            </Link>

            <button
              className="md:hidden p-2 text-white/70 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Auth area */}
            {user ? (
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(s => !s)}
                  className="flex items-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] transition-transform group-hover:scale-105">
                    <div className="w-full h-full bg-background rounded-full flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=transparent`}
                        alt={user.displayName}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-56 bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-white font-semibold text-sm truncate">{user.displayName}</p>
                        <p className="text-white/40 text-xs truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { logout(); setIsUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-white/70 hover:text-white text-sm font-semibold transition-colors"
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

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-3xl md:hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <span className="font-display font-black text-2xl text-white">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-white/70 hover:text-white bg-white/5 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex flex-col p-6 gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-display font-bold text-white/80 hover:text-white hover:pl-4 transition-all"
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <>
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-display font-bold text-white/80 hover:text-white hover:pl-4 transition-all">Sign In</Link>
                  <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-display font-bold text-primary hover:pl-4 transition-all">Sign Up</Link>
                </>
              )}
            </nav>

            <div className="mt-auto p-6 border-t border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
                <div className="w-full h-full bg-background rounded-full flex items-center justify-center overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`}
                    alt="Avatar"
                  />
                </div>
              </div>
              <div>
                {user ? (
                  <>
                    <div className="text-white font-bold">{user.displayName}</div>
                    <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="text-white/50 text-sm flex items-center gap-1 hover:text-white transition-colors">
                      <LogOut className="w-3 h-3" /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-white font-bold">Guest</div>
                    <div className="text-white/50 text-sm">Not signed in</div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
