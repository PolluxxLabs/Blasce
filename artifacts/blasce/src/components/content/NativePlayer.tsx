import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Settings, Download, Loader2, AlertCircle, CheckCircle2, Copy, X,
} from "lucide-react";

interface NativePlayerProps {
  imdbId: string;
  title: string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  onFallback: () => void;
}

interface ResolveResult {
  available: boolean;
  hlsUrl?: string;
  cloudnestraUrl?: string;
  error?: string;
}

interface Quality {
  height: number;
  bitrate: number;
  index: number;
}

function formatTime(secs: number) {
  if (!isFinite(secs)) return "0:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function NativePlayer({ imdbId, title, type, season, episode, onFallback }: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [result, setResult] = useState<ResolveResult | null>(null);
  const [resolving, setResolving] = useState(true);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [qualities, setQualities] = useState<Quality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showQuality, setShowQuality] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [copied, setCopied] = useState(false);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  const API = BASE ? `${BASE}/api` : "/api";

  // Resolve stream info from API
  useEffect(() => {
    setResolving(true);
    setResult(null);
    let url = `${API}/resolve?imdb=${encodeURIComponent(imdbId)}&type=${type}`;
    if (season) url += `&s=${season}`;
    if (episode) url += `&e=${episode}`;

    fetch(url)
      .then(r => r.json())
      .then((data: ResolveResult) => setResult(data))
      .catch(err => setResult({ available: false, error: err.message }))
      .finally(() => setResolving(false));
  }, [imdbId, type, season, episode, API]);

  // Init HLS.js when we have a hlsUrl
  const hlsUrl = result?.hlsUrl;
  useEffect(() => {
    if (!hlsUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const qs: Quality[] = data.levels.map((l, i) => ({
          height: l.height, bitrate: l.bitrate, index: i,
        }));
        setQualities(qs.sort((a, b) => b.height - a.height));
        setCurrentQuality(-1);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) onFallback();
      });

      return () => { hls.destroy(); hlsRef.current = null; };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.play().catch(() => {});
    }
  }, [hlsUrl, onFallback]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onVolumeChange = () => { setVolume(video.volume); setMuted(video.muted); };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("volumechange", onVolumeChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("volumechange", onVolumeChange);
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") { e.preventDefault(); playing ? video.pause() : video.play(); }
      if (e.code === "ArrowRight") { e.preventDefault(); video.currentTime = Math.min(video.currentTime + 10, duration); }
      if (e.code === "ArrowLeft") { e.preventDefault(); video.currentTime = Math.max(video.currentTime - 10, 0); }
      if (e.code === "KeyF") toggleFullscreen();
      if (e.code === "KeyM") video.muted = !video.muted;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, duration]);

  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.pause() : v.play();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const ratio = (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth;
    const v = videoRef.current;
    if (v && duration) v.currentTime = ratio * duration;
  };

  const setQuality = (idx: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = idx;
    setCurrentQuality(idx);
    setShowQuality(false);
  };

  const copyStreamUrl = () => {
    if (!hlsUrl) return;
    navigator.clipboard.writeText(hlsUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Loading state
  if (resolving) {
    return (
      <div className="w-full aspect-video bg-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-white/60 text-sm">Finding best stream...</p>
      </div>
    );
  }

  // Error / unavailable
  if (!result?.available) {
    return (
      <div className="w-full aspect-video bg-black flex flex-col items-center justify-center gap-4 px-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-white/70 text-sm max-w-sm">This title is not available. Try a different source.</p>
        <button
          onClick={onFallback}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/80 transition-colors"
        >
          Try Backup Source
        </button>
      </div>
    );
  }

  // Cloudnestra direct iframe mode (no HLS available — CAPTCHA or not extracted)
  if (!hlsUrl && result.cloudnestraUrl) {
    return (
      <div className="w-full aspect-video bg-black relative">
        <iframe
          src={result.cloudnestraUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 right-2 bg-black/60 text-white/50 text-[10px] px-2 py-1 rounded-md pointer-events-none">
          Ad-free · cloudnestra
        </div>
      </div>
    );
  }

  // Full HLS native player
  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black group select-none"
      onMouseMove={showControlsTemp}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={togglePlay}
    >
      <video ref={videoRef} className="w-full h-full" playsInline preload="metadata" />

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-12 h-12 text-white/80 animate-spin" />
        </div>
      )}

      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${
          showControls || !playing ? "opacity-100" : "opacity-0"
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />

        {/* Title */}
        <div className="absolute top-0 left-0 right-0 px-5 pt-4 pb-8 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <p className="text-white font-bold text-base line-clamp-1 drop-shadow">{title}
            {type === "tv" && season && episode && (
              <span className="text-white/50 font-normal ml-2">S{season} E{episode}</span>
            )}
          </p>
        </div>

        {/* Controls */}
        <div className="relative z-10 px-4 pb-4 space-y-2">
          {/* Progress bar */}
          <div
            className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/prog hover:h-2.5 transition-all duration-150"
            onClick={seek}
          >
            <div className="h-full bg-primary rounded-full relative" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow opacity-0 group-hover/prog:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors p-1">
              {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted; }}
                className="text-white hover:text-primary transition-colors p-1"
              >
                {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-primary h-1 opacity-0 group-hover/vol:opacity-100"
                onChange={e => {
                  const v = videoRef.current;
                  if (v) { v.volume = Number(e.target.value); v.muted = false; }
                }}
              />
            </div>

            <span className="text-white/60 text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
            <div className="flex-1" />

            {/* Quality */}
            {qualities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setShowQuality(p => !p); setShowDownload(false); }}
                  className="flex items-center gap-1 text-white/70 hover:text-white transition-colors text-xs font-semibold p-1"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {currentQuality === -1 ? "Auto" : `${qualities.find(q => q.index === currentQuality)?.height}p`}
                  </span>
                </button>
                {showQuality && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-xl p-1 min-w-[110px] shadow-xl">
                    <button
                      onClick={() => setQuality(-1)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        currentQuality === -1 ? "text-primary bg-primary/10" : "text-white/80 hover:bg-white/8"
                      }`}
                    >Auto</button>
                    {qualities.map(q => (
                      <button
                        key={q.index}
                        onClick={() => setQuality(q.index)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                          currentQuality === q.index ? "text-primary bg-primary/10" : "text-white/80 hover:bg-white/8"
                        }`}
                      >
                        {q.height}p
                        <span className="text-white/35 text-xs ml-1">{(q.bitrate / 1000).toFixed(0)}k</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Download / Copy URL */}
            <div className="relative">
              <button
                onClick={() => { setShowDownload(p => !p); setShowQuality(false); }}
                className="text-white/70 hover:text-white transition-colors p-1"
                title="Get stream URL"
              >
                <Download className="w-4 h-4" />
              </button>
              {showDownload && hlsUrl && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-xl p-4 w-72 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-bold text-sm">Stream URL</h4>
                    <button onClick={() => setShowDownload(false)} className="text-white/40 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-white/50 text-xs mb-3 leading-relaxed">
                    Open in <strong className="text-white/80">VLC</strong> → Network Stream, or download with <code className="text-primary">yt-dlp URL</code>
                  </p>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2 mb-3">
                    <p className="text-white/70 text-[10px] font-mono break-all line-clamp-2">{hlsUrl}</p>
                  </div>
                  <button
                    onClick={copyStreamUrl}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                      copied ? "bg-green-600/80 text-white" : "bg-primary text-white hover:bg-primary/80"
                    }`}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy URL"}
                  </button>
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors p-1">
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
