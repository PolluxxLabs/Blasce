import { X, Download, Magnet, Loader2, ExternalLink, HardDriveDownload, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface DownloadOption {
  quality: string;
  type: string;
  size: string;
  seeds: number;
  peers: number;
  hash: string;
}

interface DownloadData {
  title: string;
  year: number;
  imdbCode: string;
  pageUrl: string;
  options: DownloadOption[];
}

interface YTSMovie {
  url: string;
  imdb_code: string;
  title: string;
  year: number;
  torrents: Array<{
    quality: string;
    type: string;
    size: string;
    seeds: number;
    peers: number;
    hash: string;
  }>;
}

const TRACKERS = [
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.openbittorrent.com:80",
  "udp://tracker.coppersurfer.tk:6969",
  "udp://glotorrents.pw:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://torrent.gresille.org:80/announce",
  "udp://p4p.arenabg.com:1337",
  "udp://tracker.leechers-paradise.org:6969",
];

function buildMagnet(hash: string, title: string): string {
  const trackerStr = TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join("");
  return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}${trackerStr}`;
}

async function fetchYTSDownloads(imdbId: string): Promise<DownloadData> {
  const targetUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(imdbId)}&limit=1`;
  const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;

  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error("Service unavailable");

  const json = await res.json();
  const movies: YTSMovie[] = json?.data?.movies ?? [];
  if (!movies.length) throw new Error("Not available on YTS");

  const movie = movies[0];
  return {
    title: movie.title,
    year: movie.year,
    imdbCode: movie.imdb_code,
    pageUrl: movie.url,
    options: movie.torrents,
  };
}

const QUALITY_ORDER = ["2160p", "1080p", "1080p.x265", "720p", "480p", "360p"];

function qualitySort(a: DownloadOption, b: DownloadOption) {
  const ai = QUALITY_ORDER.indexOf(a.quality);
  const bi = QUALITY_ORDER.indexOf(b.quality);
  if (ai === -1 && bi === -1) return 0;
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

function qualityBadge(q: string) {
  if (q.startsWith("2160")) return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
  if (q.startsWith("1080")) return "text-primary bg-primary/10 border-primary/20";
  if (q.startsWith("720")) return "text-white/65 bg-white/5 border-white/12";
  return "text-white/35 bg-white/3 border-white/8";
}

interface DownloadModalProps {
  imdbId: string;
  title: string;
  onClose: () => void;
}

export function DownloadModal({ imdbId, title, onClose }: DownloadModalProps) {
  const { data, isLoading, error } = useQuery<DownloadData, Error>({
    queryKey: ["yts-download", imdbId],
    queryFn: () => fetchYTSDownloads(imdbId),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const sorted = data?.options ? [...data.options].sort(qualitySort) : [];
  const ytsSearch = `https://yts.mx/movies?quality=all&genre=all&rating=0&year=all&language=all&order_by=latest&sort_by=latest&keywords=${encodeURIComponent(imdbId)}`;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[hsl(0,0%,8%)] border border-white/8 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/12 border border-primary/20 flex items-center justify-center">
              <HardDriveDownload className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Download</h3>
              <p className="text-white/30 text-xs truncate max-w-[220px]">{title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/6 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-white/30 text-sm">Looking up download options…</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-11 h-11 rounded-full bg-white/4 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white/20" />
              </div>
              <div>
                <p className="text-white/50 text-sm font-medium mb-1">No download found</p>
                <p className="text-white/25 text-xs">{error.message}</p>
              </div>
              <a
                href={ytsSearch}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Search on YTS <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {!isLoading && data && sorted.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/30 text-xs">
                  {data.title} ({data.year}) · via{" "}
                  <a href={data.pageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    YTS
                  </a>
                </p>
                <span className="text-white/20 text-xs">{sorted.length} options</span>
              </div>

              <div className="space-y-2">
                {sorted.map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-white/3 hover:bg-white/5 rounded-xl border border-white/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${qualityBadge(opt.quality)}`}>
                          {opt.quality}
                        </span>
                        {opt.type && opt.type !== "web" && (
                          <span className="text-white/22 text-[10px] uppercase tracking-wide">{opt.type}</span>
                        )}
                        <span className="text-white/25 text-[10px]">{opt.size}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-green-400/55">{opt.seeds} seeds</span>
                        <span className="text-white/15">·</span>
                        <span className="text-white/22">{opt.peers} peers</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={buildMagnet(opt.hash, data.title)}
                        title="Open magnet link in torrent client"
                        className="p-2 rounded-lg bg-primary/8 hover:bg-primary/16 text-primary/65 hover:text-primary transition-all"
                        onClick={e => e.stopPropagation()}
                      >
                        <Magnet className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={`https://yts.mx/torrent/download/${opt.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download .torrent file"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/45 hover:text-white transition-all"
                        onClick={e => e.stopPropagation()}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <p className="text-white/18 text-[10px]">Requires a torrent client (qBittorrent etc.)</p>
                <a
                  href={data.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-primary/55 hover:text-primary transition-colors"
                >
                  View on YTS <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
