import re
import asyncio
import json
import urllib.parse
from typing import Optional
import httpx
from scrapling.parser import Adaptor
import logging

logger = logging.getLogger(__name__)

BASE_URL = "https://f2movies.gg"
SITEMAP_COUNT = 24

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": "https://f2movies.gg/",
    "DNT": "1",
}

AJAX_HEADERS = {
    **HEADERS,
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json, text/plain, */*",
}

# In-memory index: movie_id → movie dict
# movie_id format: "movie_19729" or "tv_1234" — no slashes, URL-safe
_MOVIE_INDEX: dict[str, dict] = {}
# Reverse index: numeric_id → movie_id (for lookup from sources)
_NUM_TO_ID: dict[str, str] = {}
_SITEMAP_LOADED: set[int] = set()
_SITEMAP_LOCK = asyncio.Lock()
_SITEMAP_INIT_DONE = False


# ── ID helpers ────────────────────────────────────────────────────────────────

def _make_id(content_type: str, numeric_id: str) -> str:
    """Create a URL-safe movie ID: 'movie_19729' or 'tv_1234'"""
    t = "tv" if content_type == "tv" else "movie"
    return f"{t}_{numeric_id}"


def _parse_id(movie_id: str) -> tuple[str, str]:
    """
    Parse 'movie_19729' → ('movie', '19729')
    Also accepts legacy path format 'movie/watch-...-19729' for compatibility.
    """
    if "_" in movie_id and not movie_id.startswith("movie/") and not movie_id.startswith("tv/"):
        parts = movie_id.split("_", 1)
        content_type = parts[0]
        numeric_id = parts[1]
        return content_type, numeric_id
    # Legacy path format: extract numeric ID from slug
    m = re.search(r"-(\d+)/?$", movie_id)
    numeric_id = m.group(1) if m else ""
    content_type = "tv" if movie_id.startswith("tv/") or "/tv/" in movie_id else "movie"
    return content_type, numeric_id


def _full_url_from_index(movie_id: str) -> str:
    """Get the full f2movies URL for a movie_id, using index if available."""
    entry = _MOVIE_INDEX.get(movie_id)
    if entry and entry.get("url"):
        return entry["url"]
    content_type, numeric_id = _parse_id(movie_id)
    t = "tv" if content_type == "tv" else "movie"
    return f"{BASE_URL}/{t}/watch-unknown-movies-free-hd-{numeric_id}"


def _extract_numeric_from_slug(slug: str) -> str:
    m = re.search(r"-(\d+)$", slug)
    return m.group(1) if m else ""


def _extract_title_from_slug(slug: str) -> str:
    """
    'watch-avengers-age-of-ultron-movies-free-hd-19729' → 'Avengers Age Of Ultron'
    """
    s = slug
    s = re.sub(r"^watch-", "", s)
    s = re.sub(r"-movies-free-hd-\d+$", "", s)
    s = re.sub(r"-\d+$", "", s)
    return s.replace("-", " ").strip().title()


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
    matched = sum(1 for w in words if any(w in tw or tw.startswith(w) for tw in title_words))
    if matched > 0:
        return 35 + (matched * 20 // max(len(words), 1))
    return 0


def _index_search(query: str, page: int = 1, limit: int = 20) -> dict:
    scored = [
        (score, m)
        for m in _MOVIE_INDEX.values()
        if (score := _fuzzy_score(m.get("title") or "", query)) > 0
    ]
    scored.sort(key=lambda x: (-x[0], (x[1].get("title") or "").lower()))
    hits = [m for _, m in scored]
    total = len(hits)
    start = (page - 1) * limit
    end = start + limit
    return {"results": hits[start:end], "page": page, "limit": limit, "total": total, "hasNextPage": end < total}


# ── HTTP helpers ──────────────────────────────────────────────────────────────

async def fetch_html(url: str, extra_headers: Optional[dict] = None) -> str:
    headers = {**HEADERS, **(extra_headers or {})}
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=30.0) as c:
        r = await c.get(url)
        r.raise_for_status()
        return r.text


async def fetch_json_url(url: str, extra_headers: Optional[dict] = None) -> dict:
    headers = {**AJAX_HEADERS, **(extra_headers or {})}
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=30.0) as c:
        r = await c.get(url)
        r.raise_for_status()
        return r.json()


# ── Sitemap indexing ──────────────────────────────────────────────────────────

def _parse_sitemap_urls(xml: str) -> list[str]:
    return re.findall(r"<loc>(https://f2movies\.gg/[^<]+)</loc>", xml)


def _url_to_movie(url: str) -> Optional[dict]:
    path = urllib.parse.urlparse(url).path.strip("/")
    parts = path.split("/")
    if len(parts) < 2:
        return None
    content_type_raw = parts[0]
    slug = parts[1]
    content_type = "tv" if content_type_raw == "tv" else "movie"
    title = _extract_title_from_slug(slug)
    num_id = _extract_numeric_from_slug(slug)
    if not title or not num_id:
        return None
    movie_id = _make_id(content_type, num_id)
    return {
        "id": movie_id,
        "title": title,
        "poster": None,
        "year": None,
        "rating": None,
        "type": content_type,
        "url": url,
        "numericId": num_id,
    }


async def _load_sitemap(n: int) -> int:
    if n in _SITEMAP_LOADED:
        return 0
    try:
        xml = await fetch_html(f"{BASE_URL}/sitemap-list-{n}.xml")
        urls = _parse_sitemap_urls(xml)
        added = 0
        for url in urls:
            m = _url_to_movie(url)
            if m and m["id"] not in _MOVIE_INDEX:
                _MOVIE_INDEX[m["id"]] = m
                _NUM_TO_ID[m["numericId"]] = m["id"]
                added += 1
        _SITEMAP_LOADED.add(n)
        logger.info(f"Loaded sitemap-{n}: {added} new movies (total: {len(_MOVIE_INDEX)})")
        return added
    except Exception as e:
        logger.warning(f"Failed to load sitemap-{n}: {e}")
        return 0


async def _ensure_index() -> None:
    global _SITEMAP_INIT_DONE
    if _SITEMAP_INIT_DONE:
        return
    async with _SITEMAP_LOCK:
        if _SITEMAP_INIT_DONE:
            return
        logger.info("Initialising f2movies index from sitemaps…")
        tasks = [_load_sitemap(i) for i in range(1, SITEMAP_COUNT + 1)]
        await asyncio.gather(*tasks)
        _SITEMAP_INIT_DONE = True
        logger.info(f"f2movies index ready: {len(_MOVIE_INDEX)} titles")


# ── Public scraper functions ──────────────────────────────────────────────────

async def scrape_search(query: str, page: int = 1, limit: int = 20) -> dict:
    await _ensure_index()
    return _index_search(query, page, limit)


async def scrape_sources(
    movie_id: str,
    season: Optional[int] = None,
    episode: Optional[int] = None,
) -> dict:
    """
    Get streaming sources.
    movie_id format: 'movie_19729' or 'tv_1234'
    Returns iframe sources from videostr.net / f2movies servers.
    """
    content_type, num_id = _parse_id(movie_id)
    if not num_id:
        logger.warning(f"Could not parse numeric id from: {movie_id}")
        return {"id": movie_id, "sources": [], "season": season, "episode": episode}

    page_url = _full_url_from_index(movie_id)
    ajax_headers = {**AJAX_HEADERS, "Referer": page_url}

    try:
        effective_num_id = num_id

        # For TV shows with season/episode, get the episode-specific ID
        if content_type == "tv" and season is not None and episode is not None:
            ep_num_id = await _get_tv_episode_id(num_id, season, episode, ajax_headers)
            if ep_num_id:
                effective_num_id = ep_num_id

        # Get server list
        list_html = await fetch_html(
            f"{BASE_URL}/ajax/episode/list/{effective_num_id}",
            extra_headers=ajax_headers,
        )
        page_obj = Adaptor(list_html, url=BASE_URL)
        server_items = page_obj.css("a.link-item[data-id]")

        if not server_items:
            logger.warning(f"No servers for {movie_id} (numeric: {effective_num_id})")
            return {"id": movie_id, "sources": [], "season": season, "episode": episode}

        # Fetch embed URL for each server in parallel
        async def fetch_source(item) -> Optional[dict]:
            data_id = (item.attrib.get("data-id") or "").strip()
            # title attr is "Server UpCloud"; strip the "Server " prefix if present
            title_attr = (item.attrib.get("title") or "").strip()
            span_text = ""
            spans = item.css("span")
            if spans:
                span_text = (spans[0].text or "").strip()
            server_name = span_text or title_attr.replace("Server ", "") or (item.text or "").strip() or f"Server {data_id}"
            if not data_id:
                return None
            try:
                resp = await fetch_json_url(
                    f"{BASE_URL}/ajax/episode/sources/{data_id}",
                    extra_headers=ajax_headers,
                )
                link = resp.get("link") or resp.get("url") or ""
                if link:
                    return {"quality": server_name, "url": link, "type": "iframe"}
            except Exception as e:
                logger.debug(f"Server {server_name} failed: {e}")
            return None

        tasks = [fetch_source(item) for item in server_items[:5]]
        results = await asyncio.gather(*tasks)
        sources = [s for s in results if s]

        logger.info(f"Found {len(sources)} sources for {movie_id}")
        return {"id": movie_id, "sources": sources, "season": season, "episode": episode}

    except Exception as e:
        logger.error(f"Sources error for {movie_id}: {e}")
        return {"id": movie_id, "sources": [], "season": season, "episode": episode}


async def _get_tv_episode_id(
    show_num_id: str,
    season: int,
    episode: int,
    headers: dict,
) -> Optional[str]:
    """For TV shows, resolve to the episode-level numeric ID for source lookup."""
    try:
        html = await fetch_html(
            f"{BASE_URL}/ajax/season/list/{show_num_id}",
            extra_headers=headers,
        )
        page_obj = Adaptor(html, url=BASE_URL)
        season_links = page_obj.css(f'[data-season="{season}"], a[title*="Season {season}"]')
        season_id = None
        if season_links:
            season_id = season_links[0].attrib.get("data-id") or season_links[0].attrib.get("data-season")
        if not season_id:
            season_id = show_num_id

        ep_html = await fetch_html(
            f"{BASE_URL}/ajax/season/episodes/{season_id}",
            extra_headers=headers,
        )
        ep_page = Adaptor(ep_html, url=BASE_URL)
        eps = ep_page.css("a.link-item[data-id]")
        if eps and episode <= len(eps):
            return eps[episode - 1].attrib.get("data-id")
    except Exception as e:
        logger.debug(f"TV episode lookup failed: {e}")
    return None


async def scrape_movie_detail(movie_id: str) -> Optional[dict]:
    url = _full_url_from_index(movie_id)
    try:
        html = await fetch_html(url)
        page_obj = Adaptor(html, url=url)

        og_title = page_obj.css('meta[property="og:title"]')
        title = None
        if og_title:
            raw = og_title[0].attrib.get("content") or ""
            title = re.sub(r"^Watch\s+", "", re.sub(r"\s+Online.*$", "", raw, flags=re.IGNORECASE)).strip()

        og_image = page_obj.css('meta[property="og:image"]')
        poster = og_image[0].attrib.get("content") if og_image else None

        og_desc = page_obj.css('meta[property="og:description"]')
        description = og_desc[0].attrib.get("content") if og_desc else None

        sources_data = await scrape_sources(movie_id)
        entry = _MOVIE_INDEX.get(movie_id, {})
        return {
            "id": movie_id,
            "title": title or entry.get("title") or movie_id,
            "poster": poster,
            "description": description,
            "sources": sources_data.get("sources", []),
        }
    except Exception as e:
        logger.error(f"Detail error for {movie_id}: {e}")
        return None


async def scrape_homepage(genre: Optional[str] = None) -> dict:
    await _ensure_index()
    movies = list(_MOVIE_INDEX.values())
    if genre:
        g = genre.lower()
        movies = [m for m in movies if g in (m.get("title") or "").lower()]
    return {"movies": movies[:48], "total": len(movies)}


async def scrape_trending() -> list:
    await _ensure_index()
    return list(_MOVIE_INDEX.values())[:24]


async def scrape_movies(
    page: int = 1,
    limit: int = 20,
    genre: Optional[str] = None,
    content_type: Optional[str] = None,
) -> dict:
    await _ensure_index()
    movies = list(_MOVIE_INDEX.values())
    if content_type in ("movie", "tv"):
        movies = [m for m in movies if m.get("type") == content_type]
    total = len(movies)
    start = (page - 1) * limit
    end = start + limit
    return {
        "results": movies[start:end],
        "page": page,
        "limit": limit,
        "total": total,
        "hasNextPage": end < total,
    }


async def scrape_genres() -> dict:
    return {"genres": [
        {"name": "Action", "slug": "action"},
        {"name": "Adventure", "slug": "adventure"},
        {"name": "Animation", "slug": "animation"},
        {"name": "Comedy", "slug": "comedy"},
        {"name": "Crime", "slug": "crime"},
        {"name": "Documentary", "slug": "documentary"},
        {"name": "Drama", "slug": "drama"},
        {"name": "Fantasy", "slug": "fantasy"},
        {"name": "Horror", "slug": "horror"},
        {"name": "Mystery", "slug": "mystery"},
        {"name": "Romance", "slug": "romance"},
        {"name": "Sci-Fi", "slug": "sci-fi"},
        {"name": "Thriller", "slug": "thriller"},
    ]}


async def scrape_episodes(movie_id: str, season: int = 1) -> dict:
    _, num_id = _parse_id(movie_id)
    if not num_id:
        return {"episodes": [], "season": season, "totalSeasons": 1}
    page_url = _full_url_from_index(movie_id)
    ajax_headers = {**AJAX_HEADERS, "Referer": page_url}
    try:
        html = await fetch_html(
            f"{BASE_URL}/ajax/season/list/{num_id}",
            extra_headers=ajax_headers,
        )
        page_obj = Adaptor(html, url=BASE_URL)
        season_items = page_obj.css("[data-season], .sl-title")
        total_seasons = max(len(season_items), 1)

        ep_html = await fetch_html(
            f"{BASE_URL}/ajax/episode/list/{num_id}",
            extra_headers=ajax_headers,
        )
        ep_page = Adaptor(ep_html, url=BASE_URL)
        ep_items = ep_page.css("a.link-item[data-id]")
        episodes = []
        for i, item in enumerate(ep_items):
            data_id = item.attrib.get("data-id", "")
            title = (item.text or "").strip() or f"Episode {i + 1}"
            episodes.append({
                "id": data_id,
                "title": title,
                "episode": i + 1,
                "season": season,
            })
        return {"episodes": episodes, "season": season, "totalSeasons": total_seasons}
    except Exception as e:
        logger.error(f"Episodes error: {e}")
        return {"episodes": [], "season": season, "totalSeasons": 1}
