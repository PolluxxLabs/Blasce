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
  4. Optionally try the authenticated play endpoint for a raw HLS/DASH URL
     (only works if a session token is provided via --token).

Usage:
  # Search for a single title
  python moviebox_stream_scraper.py "Inception"
  python moviebox_stream_scraper.py "Inception" --type movie

  # Search for multiple titles from a text file (one per line)
  python moviebox_stream_scraper.py --file titles.txt

  # Output as JSON
  python moviebox_stream_scraper.py "Inception" --json

  # Provide a session token for raw HLS URL extraction
  python moviebox_stream_scraper.py "Inception" --token <mb_token>

  # Save results to a CSV file
  python moviebox_stream_scraper.py --file titles.txt --output results.csv
"""

import argparse
import csv
import json
import os
import sys
import time
import warnings
from difflib import SequenceMatcher

warnings.filterwarnings("ignore", category=DeprecationWarning, module="scrapling")

import logging

# Silence all scrapling loggers (deprecation warnings + info fetches go to stderr)
_stderr_handler = logging.StreamHandler(sys.stderr)
for _log_name in ("scrapling", "scrapling.fetchers", "scrapling.engines", "root"):
    _lg = logging.getLogger(_log_name)
    _lg.setLevel(logging.WARNING)
    for _h in list(_lg.handlers):
        _lg.removeHandler(_h)
    _lg.addHandler(_stderr_handler)

# Suppress info-level logs from scrapling completely
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


# ─────────────────────────────────────────────────────────────────────────────
# API calls
# ─────────────────────────────────────────────────────────────────────────────

def search(keyword: str, page: int = 1, per_page: int = 10) -> list[dict]:
    """
    Search moviebox.ph for a keyword.
    Returns a list of subject dicts.
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
        headers={"Content-Type": "application/json"},
    )
    if resp.status != 200:
        return []
    try:
        body = json.loads((resp.body or b"").decode("utf-8", errors="ignore"))
        return body.get("data", {}).get("items", [])
    except Exception:
        return []


def get_detail(subject_id: str) -> dict:
    """
    Fetch full detail for a subject — includes resource/season/episode info.
    """
    fetcher = get_fetcher()
    resp = fetcher.get(
        f"{API_BASE}/wefeed-h5api-bff/detail?subjectId={subject_id}&host={HOST}",
        stealthy_headers=True,
        follow_redirects=True,
        timeout=15000,
    )
    if resp.status != 200:
        return {}
    try:
        body = json.loads((resp.body or b"").decode("utf-8", errors="ignore"))
        return body.get("data", {})
    except Exception:
        return {}


def get_play_url(subject_id: str, token: str | None = None) -> dict:
    """
    Attempt to fetch raw HLS/DASH stream URLs from the play endpoint.
    Requires a valid session token (mb_token cookie) — returns empty without one.
    Returns a dict with keys: hls, dash, streams.
    """
    fetcher = get_fetcher()
    extra_headers: dict[str, str] = {}
    if token:
        extra_headers["Cookie"] = f"mb_token={token}"

    resp = fetcher.get(
        f"{API_BASE}/wefeed-h5api-bff/subject/play?subjectId={subject_id}&host={HOST}",
        stealthy_headers=True,
        follow_redirects=True,
        timeout=15000,
        headers=extra_headers,
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
    verbose: bool = True,
) -> dict:
    """
    Find the best stream URL for a given title from moviebox.ph.

    Returns a dict:
    {
        "title":        str,           # matched title on moviebox.ph
        "query":        str,           # original search query
        "subject_id":   str,           # moviebox.ph internal ID
        "subject_type": int,           # 1=movie, 2=TV
        "embed_url":    str,           # player embed URL (always available if found)
        "hls_url":      str | None,    # raw HLS m3u8 (only with valid token)
        "detail_path":  str,           # slug-based detail path
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
    subject_type = best.get("subjectType", 1)
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
        "found": True,
    }

    if verbose:
        sim = _title_similarity(title, matched_title)
        print(f"    ✓ Matched: {matched_title!r} (similarity={sim:.0%}, type={type_slug})")
        print(f"    Embed URL: {embed_url}")

    # Optionally get raw HLS URL (needs token)
    if token:
        play_data = get_play_url(subject_id, token=token)
        hls_list = play_data.get("hls", [])
        streams = play_data.get("streams", [])
        if hls_list:
            result["hls_url"] = hls_list[0].get("url") if isinstance(hls_list[0], dict) else hls_list[0]
        elif streams:
            result["hls_url"] = streams[0].get("url") if isinstance(streams[0], dict) else streams[0]

        if verbose and result["hls_url"]:
            print(f"    HLS URL:  {result['hls_url']}")

    return result


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape stream URLs from moviebox.ph using Scrapling (D4Vinci).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("title", nargs="?", help="Movie/TV title to search for")
    parser.add_argument("--type", choices=["movie", "tv", "show", "series"], help="Content type filter")
    parser.add_argument("--file", help="Path to a text file with one title per line")
    parser.add_argument("--token", help="moviebox.ph session token (mb_token cookie) for raw HLS URLs")
    parser.add_argument("--json", action="store_true", dest="as_json", help="Output results as JSON")
    parser.add_argument("--output", help="Save results to a CSV file")
    parser.add_argument("--delay", type=float, default=0.8, help="Delay between requests in seconds (default: 0.8)")
    args = parser.parse_args()

    if not args.title and not args.file:
        parser.error("Provide a title argument or --file")

    # Build list of (title, type) tuples
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
        result = get_stream_url(title, content_type=ctype, token=args.token, verbose=verbose)
        results.append(result)
        if verbose:
            if not result["found"]:
                print(f"    ✗ Not found: {title!r}")
            print()

    # Output
    if args.as_json:
        print(json.dumps(results, indent=2, ensure_ascii=False))

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
