#!/usr/bin/env python3
"""
Blasce Scraper
─────────────────────────────────────────────────────────────────────────────
Data sources:
  • IMDB suggestion API  → match IMDB ID for each title
  • IMDB public datasets → official ratings (datasets.imdbws.com)
  • Rotten Tomatoes      → Tomatometer score via Scrapling (D4Vinci/Scrapling)
"""

import os
import re
import time
import gzip
import json
import urllib.parse
import urllib.request
import io
import psycopg2
from scrapling.fetchers import Fetcher

fetcher = Fetcher(auto_match=False)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL env var not set")

conn = psycopg2.connect(DATABASE_URL)
cur  = conn.cursor()


# ─────────────────────────────────────────────────────────────────────────────
# IMDB official ratings dataset
# ─────────────────────────────────────────────────────────────────────────────

def download_imdb_ratings() -> dict[str, float]:
    """
    Download IMDB's public title.ratings.tsv.gz dataset.
    Returns {imdb_id: average_rating}, e.g. {'tt1375666': 8.8}
    """
    url = "https://datasets.imdbws.com/title.ratings.tsv.gz"
    print(f"Downloading IMDB ratings dataset from {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        compressed = resp.read()

    ratings: dict[str, float] = {}
    with gzip.open(io.BytesIO(compressed)) as f:
        next(f)  # skip header: tconst\taverageRating\tnumVotes
        for line in f:
            parts = line.decode("utf-8", errors="ignore").strip().split("\t")
            if len(parts) >= 2:
                try:
                    ratings[parts[0]] = float(parts[1])
                except ValueError:
                    pass
    print(f"Loaded {len(ratings):,} IMDB ratings.\n")
    return ratings


# ─────────────────────────────────────────────────────────────────────────────
# IMDB suggestion API — find IMDB ID by title
# ─────────────────────────────────────────────────────────────────────────────

def search_imdb(title: str, year: int, content_type: str) -> dict | None:
    encoded = urllib.parse.quote_plus(title.lower())
    first   = encoded[0] if encoded else "i"
    url     = f"https://v3.sg.media-imdb.com/suggestion/titles/{first}/{encoded}.json"
    try:
        resp  = fetcher.get(url, stealthy_headers=True, follow_redirects=True)
        items = resp.json().get("d", [])

        def type_ok(item: dict) -> bool:
            q = item.get("q", "")
            if content_type == "movie":
                return "feature" in q or "movie" in q.lower() or q == "short"
            return "tvS" in q or "mini" in q.lower() or q == "tvSeries"

        for item in items:
            if type_ok(item) and abs(item.get("y", 0) - year) <= 2:
                return item
        for item in items:
            if type_ok(item):
                return item
        return items[0] if items else None

    except Exception as e:
        print(f"  [IMDB suggest error] {title}: {e}")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Rotten Tomatoes — Tomatometer via Scrapling
# ─────────────────────────────────────────────────────────────────────────────

def _rt_slug(title: str) -> str:
    slug = title.lower()
    slug = re.sub(r"[^\w\s]", "", slug)
    slug = re.sub(r"\s+", "_", slug.strip())
    return slug


def fetch_rt(title: str, year: int, content_type: str) -> dict:
    slug   = _rt_slug(title)
    prefix = "m" if content_type == "movie" else "tv"

    candidates = [
        f"https://www.rottentomatoes.com/{prefix}/{slug}",
        f"https://www.rottentomatoes.com/{prefix}/{slug}_{year}",
    ]

    for url in candidates:
        try:
            resp = fetcher.get(url, stealthy_headers=True, follow_redirects=True)
            if resp.status == 404:
                continue

            body = (resp.body or b"").decode("utf-8", errors="ignore")
            result = {}

            # 1) <score-board> web component attribute
            boards = resp.css("score-board", auto_save=False)
            if boards:
                sc = boards[0].attrib.get("tomatometerscore")
                if sc:
                    result["rt_score"] = int(sc)

            # 2) Regex in raw HTML
            if "rt_score" not in result:
                m = re.search(r'tomatometerscore="(\d+)"', body)
                if m:
                    result["rt_score"] = int(m.group(1))
            if "rt_score" not in result:
                m = re.search(r'"tomatometer(?:Score)?"\s*:\s*(\d+)', body)
                if m:
                    result["rt_score"] = int(m.group(1))

            # 3) Description from JSON-LD
            scripts = resp.css('script[type="application/ld+json"]', auto_save=False)
            for s in scripts:
                try:
                    raw = s.text or s.html_content or ""
                    ld  = json.loads(raw)
                    if ld.get("description"):
                        result["rt_description"] = ld["description"]
                    break
                except Exception:
                    pass

            # 4) Audience score for completeness (stored as comment)
            if "rt_score" in result:
                return result

        except Exception as e:
            print(f"  [RT error] {title} → {url}: {e}")

    return {}


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def run():
    # Download IMDB ratings once
    imdb_ratings = download_imdb_ratings()

    cur.execute("SELECT id, title, type, release_year FROM content ORDER BY id")
    rows = cur.fetchall()
    print(f"Processing {len(rows)} titles...\n{'─'*60}\n")

    for (cid, title, ctype, year) in rows:
        print(f"▶  {title} ({year}) [{ctype}]")
        updates: dict = {}

        # ── 1. IMDB suggestion → ID + poster thumbnail ────────────────────
        suggestion = search_imdb(title, year, ctype)
        if suggestion:
            imdb_id = suggestion.get("id", "")
            print(f"   IMDB ID : {imdb_id}")

            # Poster thumbnail from suggestion (reliable CDN)
            thumb = suggestion.get("i", {}).get("imageUrl", "")
            if thumb:
                # Request a larger version of the image
                hd = re.sub(
                    r"(_V1_).*?\.(jpg|jpeg|png)",
                    r"\1FMjpg_UX600_.\2",
                    thumb,
                )
                updates["poster_url"] = hd or thumb

            # ── 2. IMDB rating from official dataset ──────────────────────
            if imdb_id in imdb_ratings:
                updates["imdb_score"] = imdb_ratings[imdb_id]
                print(f"   IMDB    : {imdb_ratings[imdb_id]}/10")
            else:
                print(f"   IMDB    : not in dataset")
        else:
            print("   IMDB    : no suggestion match")

        time.sleep(0.8)

        # ── 3. Rotten Tomatoes ────────────────────────────────────────────
        rt = fetch_rt(title, year, ctype)
        if rt.get("rt_score") is not None:
            updates["rt_score"] = rt["rt_score"]
            print(f"   RT      : {rt['rt_score']}%")
        else:
            print("   RT      : not found")

        # ── 4. Persist ────────────────────────────────────────────────────
        if updates:
            set_sql = ", ".join(f"{k} = %s" for k in updates)
            vals    = list(updates.values()) + [cid]
            cur.execute(f"UPDATE content SET {set_sql} WHERE id = %s", vals)
            conn.commit()
            print(f"   ✓ saved : {', '.join(updates)}")
        else:
            print("   (nothing saved)")

        print()
        time.sleep(1.0)

    cur.close()
    conn.close()
    print("All done.")


if __name__ == "__main__":
    run()
