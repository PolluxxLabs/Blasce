import { X, ExternalLink } from "lucide-react";
import { useEffect } from "react";

interface StreamPlayerProps {
  streamUrl: string;
  title: string;
  onClose: () => void;
}

export function StreamPlayer({ streamUrl, title, onClose }: StreamPlayerProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/8">
        <span className="text-white/70 text-sm font-medium truncate max-w-[70%]">{title}</span>
        <div className="flex items-center gap-2">
          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-colors"
            title="Close player (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Player iframe */}
      <div className="flex-1 relative">
        <iframe
          src={streamUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
