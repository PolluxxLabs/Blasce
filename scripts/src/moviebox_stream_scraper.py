#!/usr/bin/env python3
"""
MovieBox Stream URL Scraper
────────────────────────────────────────────────────────────────────────────
Uses Scrapling (D4Vinci/Scrapling) to fetch stream URLs from moviebox.ph.

How it works:
  1. POST to the moviebox.ph search API (https://h5-api.aoneroom.com) with
     a title query — no browser or JS execution needed, the API returns JSON.
  2. Pick the best-matching result by comparing title + type (movie vs TV).
  3. Construct the embed player URL:
       https://123movienow.cc/movie/{subjectId}   ← movies
       https://123movienow.cc/tv/{subjectId}      ← TV shows
  4. Optionally try the authenticated play endpoint for raw HLS/DASH stream
     URLs (only works if a session token is provided via --token).

Auth notes (reverse-engineered from player JS id.391c190f.js):
  - The play API lives at the 123movienow.cc proxy:
      GET https://123movienow.cc/wefeed-h5api-bff/subject/play
      ?subjectId={id}&se={season}&ep={episode}&detailPath={id}
  - Anonymous requests return freeNum=999 and hasResource=false (server
    detects non-browser / server-IP requests).
  - Authenticated requests send: Authorization: Bearer {mb_token}
    (mb_token is the session token from a logged-in moviebox.ph account)
  - Anonymous requests can also use X-Client-Token: "{ts},{md5(reverse(ts))}"
    but this still doesn't unlock streams from server IPs.

Play API response structure (when authenticated):
  {
    "code": 0,
    "data": {
      "hls": [{"url": "https://...", "resolutions": "1080", "format": "HLS",
               "id": "...", "duration": 7200, "size": 0}],
      "streams": [{"url": "https://...", "resolutions": "720", "format": "MP4"}],
      "dash": [{"url": "https://...", "prePlayApi": "https://..."}],
      "hasResource": true,
      "freeNum": 4,
      "limited": false,
      "limitedCode": ""
    }
  }

Usage:
  # Search for a single title
  python moviebox_stream_scraper.py "Inception"
  python moviebox_stream_scraper.py "Inception" --type movie

  # Search for multiple titles from a text file (one per line)
  python moviebox_stream_scraper.py --file titles.txt

  # Output as JSON (clean, no logs on stdout)
  python moviebox_stream_scraper.py "Inception" --json 2>/dev/null

  # Provide a session token for raw HLS URL extraction
  python moviebox_stream_scraper.py "Inception" --token <mb_token_cookie>

  # Save results to a CSV file
  python moviebox_stream_scraper.py --file titles.txt --output results.csv
"""

import argparse
import csv
import hashlib
import json
import os
import sys
import time
import warnings
from difflib import SequenceMatcher

warnings.filterwarnings("ignore", category=DeprecationWarning, module="scrapling")

import logging

# Redirect all scrapling logs to stderr so they don't corrupt JSON stdout output
_stderr_handler = logging.StreamHandler(sys.stderr)
for _log_name in ("scrapling", "scrapling.fetchers", "scrapling.engines", "root"):
    _lg = logging.getLogger(_log_name)
    _lg.setLevel(logging.WARNING)
    for _h in list(_lg.handlers):
        _lg.removeHandler(_h)
    _lg.addHandler(_stderr_handler)
logging.getLogger("scrapling").setLevel(logging.CRITICAL)

from scrapling.fetchers import Fetcher

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

API_BASE = "https://h5-api.aoneroom.com"
PLAYER_BASE = "https://123movienow.cc"
HOST = "moviebox.ph"

SUBJECT_TYPE_MOVIE = 1
SUBJECT_TYPE_TV = 2

TYPE_MAP = {
    "movie": SUBJECT_TYPE_MOVIE,
    "tv": SUBJECT_TYPE_TV,
    "show": SUBJECT_TYPE_TV,
    "series": SUBJECT_TYPE_TV,
}

# ─────────────────────────────────────────────────────────────────────────────
# Scrapling fetcher (HTTP-only, no browser needed — stealthy curl-cffi mode)
# ─────────────────────────────────────────────────────────────────────────────

_fetcher = None


def get_fetcher() -> Fetcher:
    global _fetcher
    if _fetcher is None:
        _fetcher = Fetcher(auto_match=False)
    return _fetcher


# ─────────────────────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────────────────────

def _generate_client_token() -> str:
    """
    Generate an anonymous X-Client-Token.
    Reverse-engineered from DoSAbACA.js (lw() + cw() functions):
      cw(ts) = str(ts)[::-1]       # reverse the timestamp digits
      lw()   = f"{ts},{md5(cw(ts))}"
    Note: server-IP requests still return hasResource=false even with this token.
    A real mb_token (Bearer auth) is needed for actual stream URLs.
    """
    ts = int(time.time())
    reversed_ts = str(ts)[::-1]
    md5_hash = hashlib.md5(reversed_ts.encode()).hexdigest()
    return f"{ts},{md5_hash}"


def _play_headers(token: str | None = None) -> dict:
    """
    Build headers for the play API call.
    - Without token: anonymous X-Client-Token (discovered from player JS)
    - With token: Authorization: Bearer {mb_token}
    """
    import json as _json

    tz = "America/New_York"
    base = {
        "Accept": "application/json",
        "content-type": "application/json",
        "X-Client-Info": _json.dumps({"timezone": tz}),
        "X-Request-Lang": "en",
    }

    if token:
        base["Authorization"] = f"Bearer {token}"
    else:
        base["X-Client-Token"] = _generate_client_token()
        base["Authorization"] = ""

    return base


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _title_similarity(a: str, b: str) -> float:
    """Case-insensitive sequence-matcher similarity [0, 1]."""
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def _pick_best_match(items: list[dict], title: str, content_type: int | None) -> dict | None:
    """
    Return the best-matching item from the search results.
    Scoring:
      - Title similarity (weighted 0.7)
      - Type match bonus (weighted 0.3)
    Minimum thresholds: combined score >= 0.5, title similarity >= 0.4.
    """
    if not items:
        return None

    scored = []
    for item in items:
        sim = _title_similarity(title, item.get("title", ""))
        type_ok = (
            content_type is None
            or item.get("subjectType") == content_type
        )
        score = sim * 0.7 + (0.3 if type_ok else 0.0)
        scored.append((score, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    best_score, best_item = scored[0]

    best_title_sim = _title_similarity(title, best_item.get("title", ""))
    if best_score < 0.5 or best_title_sim < 0.4:
        return None

    return best_item


def _best_stream_url(play_data: dict) -> str | None:
    """Pick the best stream URL from play API response (prefers HLS > streams > dash)."""
    hls = play_data.get("hls") or []
    streams = play_data.get("streams") or []
    dash = play_data.get("dash") or []

    for source in [hls, streams, dash]:
        if source:
            item = source[0]
            if isinstance(item, dict):
                return item.get("url") or item.get("prePlayApi")
            return str(item)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# API calls
# ─────────────────────────────────────────────────────────────────────────────

def search(keyword: str, page: int = 1, per_page: int = 10) -> list[dict]:
    """
    Search moviebox.ph for a keyword.
    Returns a list of subject dicts from the h5-api search endpoint.
    """
    fetcher = get_fetcher()
    payload = json.dumps({
        "keyword": keyword,
        "page": page,
        "perPage": per_page,
        "host": HOST,
    })
    resp = fetcher.post(
        f"{API_BASE}/wefeed-h5api-bff/subject/search",
        data=payload,
        stealthy_headers=True,
        follow_redirects=True,
        timeout=15000,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    if resp.status != 200:
        return []
    try:
        body = json.loads((resp.body or b"").decode("utf-8", errors="ignore"))
        return body.get("data", {}).get("items", []) or body.get("data", {}).get("list", [])
    except Exception:
        return []


def get_play_data(
    subject_id: str,
    subject_type: int = SUBJECT_TYPE_MOVIE,
    season: int = 0,
    episode: int = 0,
    token: str | None = None,
) -> dict:
    """
    Fetch play data from the 123movienow.cc proxy endpoint.

    Endpoint (reverse-engineered from player JS vS() function in id.391c190f.js):
      GET https://123movienow.cc/wefeed-h5api-bff/subject/play
          ?subjectId={id}&se={season}&ep={episode}&detailPath={id}

    Auth:
      - Unauthenticated: returns hasResource=false, freeNum=999 for server IPs
      - Authenticated (token): returns hls/streams/dash URLs

    Response fields:
      hls      - list of HLS stream objects: {url, resolutions, format, id, duration, size}
      streams  - list of MP4 stream objects: {url, resolutions, format, id}
      dash     - list of DASH stream objects: {url, prePlayApi}
      hasResource - bool, true if content has playable streams
      freeNum  - int, free watch quota (4 for real users, 999 for unauthenticated)
      limited  - bool, true if user exceeded free limit
    """
    fetcher = get_fetcher()
    url = (
        f"{PLAYER_BASE}/wefeed-h5api-bff/subject/play"
        f"?subjectId={subject_id}&se={season}&ep={episode}&detailPath={subject_id}"
    )
    headers = {
        "Accept": "application/json",
        "X-Client-Info": json.dumps({"timezone": "America/New_York"}),
        "X-Source": "",
        "Referer": f"{PLAYER_BASE}/{'movie' if subject_type == SUBJECT_TYPE_MOVIE else 'tv'}/{subject_id}",
        "Origin": PLAYER_BASE,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    resp = fetcher.get(
        url,
        stealthy_headers=True,
        follow_redirects=True,
        timeout=15000,
        headers=headers,
    )
    if resp.status != 200:
        return {}
    try:
        body = json.loads((resp.body or b"").decode("utf-8", errors="ignore"))
        return body.get("data", {})
    except Exception:
        return {}


# ─────────────────────────────────────────────────────────────────────────────
# Core scraping logic
# ─────────────────────────────────────────────────────────────────────────────

def get_stream_url(
    title: str,
    content_type: str | None = None,
    token: str | None = None,
    season: int | None = None,
    episode: int | None = None,
    verbose: bool = True,
) -> dict:
    """
    Find the best stream URL for a given title from moviebox.ph.

    Returns a dict:
    {
        "query":        str,           # original search query
        "title":        str,           # matched title on moviebox.ph
        "subject_id":   str,           # moviebox.ph internal ID
        "subject_type": int,           # 1=movie, 2=TV
        "embed_url":    str,           # player embed URL (always available if found)
        "hls_url":      str | None,    # raw stream URL (only with valid token + real browser IP)
        "detail_path":  str,           # slug-based detail path
        "play_data":    dict | None,   # full play API response (when token provided)
        "found":        bool,
    }
    """
    type_int = TYPE_MAP.get((content_type or "").lower()) if content_type else None

    if verbose:
        print(f"  Searching: {title!r}", end="", flush=True)

    items = search(title)

    if verbose:
        print(f" → {len(items)} results", flush=True)

    best = _pick_best_match(items, title, type_int)

    if best is None:
        return {"query": title, "found": False}

    subject_id = best["subjectId"]
    subject_type = best.get("subjectType", SUBJECT_TYPE_MOVIE)
    matched_title = best.get("title", title)
    detail_path = best.get("detailPath", "")

    type_slug = "movie" if subject_type == SUBJECT_TYPE_MOVIE else "tv"
    embed_url = f"{PLAYER_BASE}/{type_slug}/{subject_id}"

    result: dict = {
        "query": title,
        "title": matched_title,
        "subject_id": subject_id,
        "subject_type": subject_type,
        "embed_url": embed_url,
        "hls_url": None,
        "detail_path": detail_path,
        "play_data": None,
        "found": True,
    }

    if verbose:
        sim = _title_similarity(title, matched_title)
        print(f"    ✓ Matched: {matched_title!r} (similarity={sim:.0%}, type={type_slug})")
        print(f"    Embed URL: {embed_url}")

    if token:
        se = season if season is not None else (1 if subject_type == SUBJECT_TYPE_TV else 0)
        ep = episode if episode is not None else (1 if subject_type == SUBJECT_TYPE_TV else 0)

        play_data = get_play_data(
            subject_id,
            subject_type=subject_type,
            season=se,
            episode=ep,
            token=token,
        )
        result["play_data"] = play_data

        if play_data.get("hasResource"):
            stream_url = _best_stream_url(play_data)
            result["hls_url"] = stream_url
            if verbose and stream_url:
                print(f"    Stream URL: {stream_url}")
            elif verbose:
                print(f"    ⚠  hasResource=true but no stream URL in response")
        else:
            if verbose:
                free_num = play_data.get("freeNum")
                if free_num == 999:
                    print(f"    ⚠  Token provided but server returned hasResource=false "
                          f"(server-IP detection — try from a real browser session)")
                else:
                    print(f"    ⚠  hasResource=false (content may not be available)")

    return result


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape stream URLs from moviebox.ph using Scrapling.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("title", nargs="?", help="Movie/TV title to search for")
    parser.add_argument("--type", choices=["movie", "tv", "show", "series"], help="Content type filter")
    parser.add_argument("--file", help="Path to a text file with one title per line (format: Title|type)")
    parser.add_argument(
        "--token",
        help="moviebox.ph session token (mb_token from logged-in browser session) for raw stream URLs",
    )
    parser.add_argument("--season", type=int, help="Season number for TV shows (default: 1)")
    parser.add_argument("--episode", type=int, help="Episode number for TV shows (default: 1)")
    parser.add_argument("--json", action="store_true", dest="as_json", help="Output results as JSON to stdout")
    parser.add_argument("--output", help="Save results to a CSV file")
    parser.add_argument("--delay", type=float, default=0.8, help="Delay between requests in seconds (default: 0.8)")
    args = parser.parse_args()

    if not args.title and not args.file:
        parser.error("Provide a title argument or --file")

    queries: list[tuple[str, str | None]] = []

    if args.title:
        queries.append((args.title, args.type))

    if args.file:
        try:
            with open(args.file, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        parts = line.split("|", 1)
                        t = parts[0].strip()
                        ct = parts[1].strip() if len(parts) > 1 else args.type
                        queries.append((t, ct))
        except FileNotFoundError:
            print(f"Error: file not found: {args.file}", file=sys.stderr)
            sys.exit(1)

    results: list[dict] = []
    verbose = not args.as_json

    if verbose:
        print(f"\nSearching {len(queries)} title(s) on moviebox.ph ...\n{'─'*60}")

    for i, (title, ctype) in enumerate(queries):
        if i > 0:
            time.sleep(args.delay)
        result = get_stream_url(
            title,
            content_type=ctype,
            token=args.token,
            season=args.season,
            episode=args.episode,
            verbose=verbose,
        )
        results.append(result)
        if verbose:
            if not result["found"]:
                print(f"    ✗ Not found: {title!r}")
            print()

    if args.as_json:
        # Strip play_data from JSON output by default (too verbose)
        output = [
            {k: v for k, v in r.items() if k != "play_data"}
            for r in results
        ]
        print(json.dumps(output, indent=2, ensure_ascii=False))

    if args.output:
        fieldnames = ["query", "found", "title", "subject_id", "subject_type", "embed_url", "hls_url", "detail_path"]
        with open(args.output, "w", newline="", encoding="utf-8") as csvf:
            writer = csv.DictWriter(csvf, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(results)
        if verbose:
            print(f"Results saved to {args.output}")

    if verbose:
        found = sum(1 for r in results if r.get("found"))
        print(f"{'─'*60}\nDone. {found}/{len(results)} titles found.")

    sys.exit(0 if all(r.get("found") for r in results) else 1)


if __name__ == "__main__":
    main()
