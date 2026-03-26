import { Link } from "wouter";
import { motion } from "framer-motion";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="mb-8"
        >
          <div className="text-[10rem] font-display font-black leading-none text-white/5 select-none">
            404
          </div>
          <div className="-mt-16 relative z-10">
            <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4">
              Page Not Found
            </h1>
            <p className="text-white/50 text-lg leading-relaxed">
              The page you're looking for doesn't exist or may have been moved.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/browse"
            className="flex items-center gap-2 px-6 py-3 bg-white/8 hover:bg-white/15 text-white font-semibold rounded-xl border border-white/10 transition-all hover:scale-105 active:scale-95"
          >
            <Search className="w-4 h-4" />
            Browse Content
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
