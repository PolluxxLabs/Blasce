import re
import asyncio
import json
import urllib.parse
from typing import Optional
import httpx
from scrapling.fetchers import Fetcher
from scrapling.parser import Adaptor
import logging

logger = logging.getLogger(__name__)

BASE_URL = "https://moviebox.ph"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": "https://moviebox.ph/",
    "DNT": "1",
}

QUALITY_LABELS = {"ld": "360p", "sd": "480p", "hd": "720p", "fhd": "1080p"}

_MOVIE_INDEX: dict[str, dict] = {}


def _index_movies(movies: list[dict]) -> None:
    for m in movies:
        mid = m.get("id")
        if mid and mid not in _MOVIE_INDEX:
            _MOVIE_INDEX[mid] = m


def _fuzzy_score(title: str, query: str) -> int:
    t = title.lower()
    q = query.lower().strip()
    if not q:
        return 0
    if t == q:
        return 100
    if t.startswith(q):
        return 92
    if q in t:
        return 82
    words = q.split()
    title_words = t.split()
    if len(words) > 1 and all(w in t for w in words):
        return 75
    if 2 <= len(q) <= 6 and q.replace(" ", "").isalpha():
        acronym = "".join(w[0] for w in title_words if w)
        if acronym == q or acronym.startswith(q):
            return 68
    matched = sum(1 for w in words if any(w in tw or tw.startswith(w) for tw in title_words))
    if matched > 0:
        return 35 + (matched * 20 // max(len(words), 1))
    return 0


def _index_search(query: str, page: int = 1, limit: int = 20) -> dict:
    scored = [(score, m) for m in _MOVIE_INDEX.values() if (score := _fuzzy_score(m.get("title") or "", query)) > 0]
    scored.sort(key=lambda x: (-x[0], (x[1].get("title") or "").lower()))
    hits = [m for _, m in scored]
    total = len(hits)
    start = (page - 1) * limit
    end = start + limit
    return {"results": hits[start:end], "page": page, "limit": limit, "total": total, "hasNextPage": end < total}


def slugify_id(url: str) -> str:
    path = urllib.parse.urlparse(url).path.strip("/")
    return path[len("detail/"):] if path.startswith("detail/") else urllib.parse.quote(path, safe="")


def decode_movie_id(movie_id: str) -> str:
    return f"detail/{movie_id}"


async def fetch_html(url: str) -> str:
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30.0) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.text


def parse_page(html: str, base_url: str = BASE_URL) -> Adaptor:
    return Adaptor(html, url=base_url)


def css1(page, selector: str):
    results = page.css(selector)
    return results[0] if results else None


def get_attr(el, attr: str) -> Optional[str]:
    val = el.attrib.get(attr)
    return val.strip() if val else None


def parse_nuxt_data(page) -> list:
    scripts = page.css('script[id="__NUXT_DATA__"]')
    if scripts:
        try:
            return json.loads(scripts[0].text or "[]")
        except Exception:
            pass
    return []


def extract_streams_from_nuxt(data: list) -> list:
    seen: set[str] = set()
    streams = []
    for item in data:
        if isinstance(item, str) and "macdn.aoneroom.com" in item and ".mp4" in item and item not in seen:
            seen.add(item)
            streams.append(item)
    return streams


def build_quality_variants(stream_url: str) -> list:
    m = re.search(r"(https://macdn\.aoneroom\.com/media/vone/\d{4}/\d{2}/\d{2}/[a-f0-9]+)-\w+\.mp4", stream_url)
    if not m:
        suffix = next((s for s in QUALITY_LABELS if f"-{s}.mp4" in stream_url), None)
        quality = QUALITY_LABELS.get(suffix, "Unknown") if suffix else "Unknown"
        return [{"quality": quality, "url": stream_url}]
    base = m.group(1)
    return [{"quality": label, "url": f"{base}-{suffix}.mp4"} for suffix, label in QUALITY_LABELS.items()]


def extract_movie_card(card) -> Optional[dict]:
    try:
        href = get_attr(card, "href") or ""
        if not href or "/detail/" not in href:
            return None
        full_url = BASE_URL + href if not href.startswith("http") else href
        movie_id = slugify_id(full_url)

        title = None
        title_attr = get_attr(card, "title") or ""
        if "go to " in title_attr and " detail page" in title_attr:
            title = title_attr.replace("go to ", "").replace(" detail page", "").strip()
        if not title:
            p_els = card.css("p")
            title = (p_els[0].text or "").strip() if p_els else None
        if not title or len(title) < 2:
            return None

        all_p = card.css("p")
        year = rating = None
        for p in all_p[1:]:
            text = (p.text or "").strip()
            if re.match(r"^\d{4}$", text):
                year = text
            elif re.match(r"^\d+\.?\d*$", text):
                rating = text

        content_type = "tv-show" if "-season-" in href or "/series/" in href else "movie"
        return {"id": movie_id, "title": title, "poster": None, "year": year, "rating": rating, "type": content_type}
    except Exception:
        return None


# ── Public scraper functions ──────────────────────────────────────────────────

async def scrape_homepage(genre: Optional[str] = None) -> dict:
    url = BASE_URL + (f"/?genre={urllib.parse.quote(genre)}" if genre else "/")
    html = await fetch_html(url)
    page = parse_page(html, url)
    movies = [m for card in page.css("a.movie-card") if (m := extract_movie_card(card))]
    _index_movies(movies)
    return {"movies": movies, "total": len(movies)}


async def scrape_trending() -> list:
    for url in [BASE_URL + "/trending", BASE_URL + "/"]:
        try:
            html = await fetch_html(url)
            page = parse_page(html, url)
            movies = [m for card in page.css("a.movie-card") if (m := extract_movie_card(card))]
            if movies:
                _index_movies(movies)
                return movies
        except Exception:
            pass
    return []


async def scrape_movies(page: int = 1, limit: int = 20, genre: Optional[str] = None, content_type: Optional[str] = None) -> dict:
    url = BASE_URL + (f"/?genre={urllib.parse.quote(genre)}" if genre else "/")
    html = await fetch_html(url)
    page_obj = parse_page(html, url)
    movies = [m for card in page_obj.css("a.movie-card") if (m := extract_movie_card(card))]
    if content_type in ("movie", "tv-show"):
        movies = [m for m in movies if m.get("type") == content_type]
    _index_movies(movies)
    total = len(movies)
    start = (page - 1) * limit
    end = start + limit
    return {"results": movies[start:end], "page": page, "limit": limit, "total": total, "hasNextPage": end < total}


async def scrape_search(query: str, page: int = 1, limit: int = 20) -> dict:
    encoded = urllib.parse.quote(query)
    for url in [f"{BASE_URL}/search/{encoded}", f"{BASE_URL}/search?q={encoded}"]:
        try:
            html = await fetch_html(url)
            page_obj = parse_page(html, url)
            movies = [m for card in page_obj.css("a.movie-card") if (m := extract_movie_card(card))]
            if movies:
                _index_movies(movies)
                total = len(movies)
                start = (page - 1) * limit
                end = start + limit
                return {"results": movies[start:end], "page": page, "limit": limit, "total": total, "hasNextPage": end < total}
        except Exception:
            pass
    # Fallback: in-memory fuzzy index
    result = _index_search(query, page, limit)
    if result["total"] > 0:
        return result
    # Expand index from homepage then retry
    try:
        html = await fetch_html(BASE_URL + "/")
        page_obj = parse_page(html, BASE_URL + "/")
        _index_movies([m for card in page_obj.css("a.movie-card") if (m := extract_movie_card(card))])
    except Exception:
        pass
    return _index_search(query, page, limit)


async def scrape_genres() -> dict:
    try:
        html = await fetch_html(BASE_URL + "/")
        page_obj = parse_page(html, BASE_URL)
        seen: set[str] = set()
        genres = []
        for link in page_obj.css('a[href*="/genre/"], a[href*="?genre="]'):
            name = (link.text or "").strip()
            if name and name not in seen:
                seen.add(name)
                genres.append({"name": name, "slug": get_attr(link, "href") or ""})
        return {"genres": genres}
    except Exception:
        return {"genres": []}


async def scrape_sources(movie_id: str, season: Optional[int] = None, episode: Optional[int] = None) -> dict:
    decoded_path = decode_movie_id(movie_id)
    url = f"{BASE_URL}/{decoded_path}"
    logger.info(f"Scraping sources: {url}")
    try:
        html = await fetch_html(url)
        page_obj = parse_page(html, url)
        nuxt = parse_nuxt_data(page_obj)
        raw_streams = extract_streams_from_nuxt(nuxt)

        for v in page_obj.css("video"):
            src = get_attr(v, "src")
            if src and "macdn.aoneroom.com" in src and ".mp4" in src and src not in raw_streams:
                raw_streams.append(src)

        all_sources: list[dict] = []
        seen_bases: set[str] = set()
        for stream in raw_streams:
            variants = build_quality_variants(stream)
            base = variants[0]["url"].rsplit("-", 1)[0] if variants else stream
            if base not in seen_bases:
                seen_bases.add(base)
                for v in variants:
                    all_sources.append({"quality": v["quality"], "url": v["url"], "type": "mp4"})

        logger.info(f"Found {len(all_sources)} sources for {movie_id}")
        return {"id": movie_id, "sources": all_sources, "season": season, "episode": episode}
    except Exception as e:
        logger.error(f"Sources error: {e}")
        return {"id": movie_id, "sources": [], "season": season, "episode": episode}


async def scrape_episodes(movie_id: str, season: int = 1) -> dict:
    url = f"{BASE_URL}/{decode_movie_id(movie_id)}"
    try:
        html = await fetch_html(url)
        page_obj = parse_page(html, url)
        episodes = []
        seen: set[str] = set()
        for link in page_obj.css('[class*="episode"] a, [class*="Episode"] a'):
            href = get_attr(link, "href") or ""
            if "/detail/" not in href:
                continue
            full_url = href if href.startswith("http") else BASE_URL + href
            ep_id = slugify_id(full_url)
            if not ep_id or ep_id in seen:
                continue
            seen.add(ep_id)
            ep_num = len(episodes) + 1
            episodes.append({"id": ep_id, "title": (link.text or "").strip() or f"Episode {ep_num}", "episode": ep_num, "season": season})
        return {"episodes": episodes, "season": season, "totalSeasons": 1}
    except Exception as e:
        logger.error(f"Episodes error: {e}")
        return {"episodes": [], "season": season, "totalSeasons": 1}


async def scrape_movie_detail(movie_id: str) -> Optional[dict]:
    url = f"{BASE_URL}/{decode_movie_id(movie_id)}"
    try:
        html = await fetch_html(url)
        page_obj = parse_page(html, url)
        og_title = css1(page_obj, 'meta[property="og:title"]')
        title = None
        if og_title:
            raw = get_attr(og_title, "content") or ""
            title = re.sub(r"^Watch\s+", "", re.sub(r"\s+Streaming Online.*$", "", raw, flags=re.IGNORECASE)).strip()
        og_image = css1(page_obj, 'meta[property="og:image"]')
        poster = get_attr(og_image, "content") if og_image else None
        og_desc = css1(page_obj, 'meta[property="og:description"]')
        description = get_attr(og_desc, "content") if og_desc else None
        sources_data = await scrape_sources(movie_id)
        return {"id": movie_id, "title": title or "Unknown", "poster": poster, "description": description, "sources": sources_data.get("sources", [])}
    except Exception as e:
        logger.error(f"Detail error: {e}")
        return None
