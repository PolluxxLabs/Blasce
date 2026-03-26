import { useState } from "react";
import { useLocation } from "wouter";
import { User, Lock, LogOut, Save, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Profile() {
  const { user, logout, updateUserProfile } = useAuth();
  const [, navigate] = useLocation();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setStatus("error");
      setErrorMsg("Passwords do not match");
      return;
    }
    if (password && password.length < 6) {
      setStatus("error");
      setErrorMsg("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    setStatus("idle");
    try {
      await updateUserProfile(
        displayName !== user.displayName ? displayName : undefined,
        password || undefined
      );
      setPassword("");
      setConfirmPassword("");
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2">Account</h1>
          <p className="text-white/40 text-sm">{user.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile section */}
          <div className="bg-white/4 border border-white/8 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-white font-semibold">Profile</h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"
                placeholder="Your display name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-white/3 border border-white/6 rounded-xl py-3 px-4 text-white/35 text-sm cursor-not-allowed"
              />
              <p className="text-white/25 text-xs">Email cannot be changed</p>
            </div>
          </div>

          {/* Password section */}
          <div className="bg-white/4 border border-white/8 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
                <Lock className="w-4 h-4 text-white/60" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Change Password</h2>
                <p className="text-white/35 text-xs mt-0.5">Leave blank to keep current password</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"
                placeholder="New password (min. 6 characters)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          {/* Status feedback */}
          {status === "success" && (
            <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm font-medium">Changes saved successfully</p>
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/40 hover:text-red-400 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl px-6 py-3 text-sm transition-all shadow-lg"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Member since */}
        {user.createdAt && (
          <p className="text-center text-white/20 text-xs mt-10">
            Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}
