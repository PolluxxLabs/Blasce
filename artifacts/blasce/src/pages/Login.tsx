import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Mail, Lock, Film, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — cinematic backdrop */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <img
          src="https://image.tmdb.org/t/p/original/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg"
          alt="Blasce"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Film className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="font-display font-bold text-xl text-white">Blasce</span>
          </Link>

          <div>
            <blockquote className="text-white/60 text-lg italic leading-relaxed mb-4 max-w-sm">
              "Every film is a mystery. And you are always in search of the truth."
            </blockquote>
            <span className="text-white/35 text-sm">— David Lynch</span>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Film className="w-3 h-3 text-black" />
            </div>
            <span className="font-display font-bold text-lg text-white">Blasce</span>
          </Link>

          <h1 className="text-3xl font-display font-bold text-white mb-1.5">Welcome back</h1>
          <p className="text-white/40 text-sm mb-8">Sign in to continue watching.</p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="w-full bg-white/4 border border-white/8 text-white placeholder:text-white/25 rounded-xl px-3.5 py-3 pl-10 focus:outline-none focus:border-primary/50 focus:bg-white/6 transition-all text-sm"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                className="w-full bg-white/4 border border-white/8 text-white placeholder:text-white/25 rounded-xl px-3.5 py-3 pl-10 pr-11 focus:outline-none focus:border-primary/50 focus:bg-white/6 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-black font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-1 shadow-[0_0_28px_hsl(38,90%,54%,0.3)]"
            >
              {loading ? (
                <span className="w-4.5 h-4.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-white/35 text-sm text-center mt-6">
            New to Blasce?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
