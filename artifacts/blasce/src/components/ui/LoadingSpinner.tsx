import { Loader2 } from "lucide-react";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center p-8 ${className || ""}`}>
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
        <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
      </div>
      <h2 className="mt-6 text-xl font-display font-semibold text-white/80 animate-pulse">
        Loading Blasce...
      </h2>
    </div>
  );
}
