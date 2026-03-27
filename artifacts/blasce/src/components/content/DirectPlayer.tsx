import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, AlertCircle, ChevronDown } from "lucide-react";

interface DirectSource {
  quality: string;
  url: string;
  type: "mp4" | "hls" | string;
}

interface DirectPlayerProps {
  sources: DirectSource[];
  title?: string;
}

const QUALITY_ORDER = ["1080p", "720p", "480p", "360p", "Auto", "Unknown"];

function sortSources(sources: DirectSource[]): DirectSource[] {
  return [...sources].sort((a, b) => {
    const ai = QUALITY_ORDER.indexOf(a.quality);
    const bi = QUALITY_ORDER.indexOf(b.quality);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function DirectPlayer({ sources, title }: DirectPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const sorted = sortSources(sources);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showQuality, setShowQuality] = useState(false);

  const active = sorted[activeIdx];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;

    setLoading(true);
    setError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = active.type === "hls" || active.url.includes(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.loadSource(active.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError(true);
          setLoading(false);
        }
      });
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = active.url;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
        video.play().catch(() => {});
      }, { once: true });
    } else {
      video.src = active.url;
      video.addEventListener("canplay", () => setLoading(false), { once: true });
      video.addEventListener("error", () => { setError(true); setLoading(false); }, { once: true });
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [active]);

  function switchQuality(idx: number) {
    setActiveIdx(idx);
    setShowQuality(false);
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-3">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-white/60 text-sm">Stream failed — try another quality</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {sorted.map((s, i) => (
              <button
                key={i}
                onClick={() => switchQuality(i)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-primary hover:text-black transition-colors text-white"
              >
                {s.quality}
              </button>
            ))}
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
        title={title}
      />

      {sorted.length > 1 && (
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={() => setShowQuality(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white text-sm font-medium border border-white/10 hover:border-primary/50 transition-colors"
            >
              {active?.quality}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showQuality && (
              <div className="absolute top-full right-0 mt-1.5 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden min-w-[100px]">
                {sorted.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => switchQuality(i)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      i === activeIdx
                        ? "bg-primary text-black font-semibold"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    {s.quality}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
