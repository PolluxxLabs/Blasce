import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Movies", path: "/browse?type=movie" },
    { label: "TV Shows", path: "/browse?type=tv" },
    { label: "Watchlist", path: "/watchlist" },
  ];

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
            <Link href="/" className="flex items-center gap-3 group">
              <img 
                src={`${import.meta.env.BASE_URL}images/logo.png`} 
                alt="Blasce Logo" 
                className="w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-110 group-active:scale-95"
              />
              <span className="font-display font-black text-2xl md:text-3xl tracking-tight text-white">
                Blasce<span className="text-primary">.</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = location === link.path || (link.path.includes('?') && location.startsWith(link.path.split('?')[0]));
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
            
            <div className="hidden md:block w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] cursor-pointer hover:scale-105 transition-transform">
              <div className="w-full h-full bg-background rounded-full border-2 border-transparent flex items-center justify-center overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=blasce_user&backgroundColor=transparent`} 
                  alt="Avatar" 
                  className="w-full h-full"
                />
              </div>
            </div>
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
            </nav>
            <div className="mt-auto p-6 border-t border-white/10 flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
                  <div className="w-full h-full bg-background rounded-full flex items-center justify-center overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=blasce_user`} alt="Avatar" />
                  </div>
                </div>
                <div>
                  <div className="text-white font-bold">Guest User</div>
                  <div className="text-white/50 text-sm">Session Active</div>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
