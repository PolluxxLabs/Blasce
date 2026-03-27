import re
import asyncio
import json
import os
import urllib.parse
from typing import Optional, List
import httpx
from scrapling.parser import Adaptor
import logging

logger = logging.getLogger(__name__)

BASE_URL = "https://moviebox.ph"
CDN_BASE = "https://macdn.aoneroom.com"
API_BASE = "https://h5-api.aoneroom.com/wefeed-h5api-bff"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://moviebox.ph/",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

QUALITY_SUFFIXES = ["ld", "sd", "hd", "fhd"]
QUALITY_LABELS   = {"ld": "360p", "sd": "480p", "hd": "720p", "fhd": "1080p"}

# ── Global movie index ─────────────────────────────────────────────────────────
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
    def word_starts_match(qw: str) -> bool:
        return any(tw.startswith(qw) for tw in title_words)
    if len(words) > 1 and all(word_starts_match(w) for w in words):
        return 65
    matched = sum(1 for w in words if any(w in tw or tw.startswith(w) for tw in title_words))
    if matched > 0:
        return 35 + (matched * 20 // max(len(words), 1))
    if len(q) <= 3 and title_words and title_words[0].startswith(q[0]):
        return 15
    return 0

def _index_search(query: str, page: int = 1, limit: int = 20) -> dict:
    scored = []
    for m in _MOVIE_INDEX.values():
        score = _fuzzy_score(m.get("title") or "", query)
        if score > 0:
            scored.append((score, m))
    scored.sort(key=lambda x: (-x[0], (x[1].get("title") or "").lower()))
    hits = [m for _, m in scored]
    total = len(hits)
    start = (page - 1) * limit
    end = start + limit
    return {
        "results": hits[start:end],
        "page": page,
        "limit": limit,
        "total": total,
        "hasNextPage": end < total,
    }

def slugify_id(url: str) -> str:
    path = urllib.parse.urlparse(url).path.strip("/")
    if path.startswith("detail/"):
        return path[len("detail/"):]
    return urllib.parse.quote(path, safe="")

def decode_movie_id(movie_id: str) -> str:
    return f"detail/{movie_id}"

# ── Static HTML fetch via httpx ────────────────────────────────────────────────
async def fetch_html(url: str) -> str:
    async with httpx.AsyncClient(
        headers=HEADERS,
        follow_redirects=True,
        timeout=30.0,
    ) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.text

def parse_page(html: str, base_url: str = BASE_URL) -> Adaptor:
    return Adaptor(html, url=base_url)

def css1(page, selector: str):
    results = page.css(selector)
    return results[0] if results else None

def get_text(page, selector: str) -> Optional[str]:
    el = css1(page, selector)
    return el.text.strip() if el and el.text else None

def get_attr(el, attr: str) -> Optional[str]:
    val = el.attrib.get(attr)
    return val.strip() if val else None

def parse_json_ld(page) -> dict:
    scripts = page.css('script[type="application/ld+json"]')
    for script in scripts:
        try:
            data = json.loads(script.text or "")
            if isinstance(data, dict) and data.get("@type") in ("VideoObject", "Movie", "TVSeries"):
                return data
        except Exception:
            pass
    return {}

def parse_nuxt_data(page) -> list:
    scripts = page.css('script[id="__NUXT_DATA__"]')
    if scripts:
        try:
            return json.loads(scripts[0].text or "[]")
        except Exception:
            pass
    return []

def extract_streams_from_nuxt(data: list) -> list:
    streams = []
    seen = set()
    for item in data:
        if isinstance(item, str) and "macdn.aoneroom.com" in item and ".mp4" in item:
            if item not in seen:
                seen.add(item)
                streams.append(item)
    return streams

def determine_quality(url: str) -> str:
    for suffix, label in QUALITY_LABELS.items():
        if f"-{suffix}.mp4" in url:
            return label
    return "Unknown"

def build_quality_variants(stream_url: str) -> list:
    base_match = re.search(
        r"(https://macdn\.aoneroom\.com/media/vone/\d{4}/\d{2}/\d{2}/[a-f0-9]+)-\w+\.mp4",
        stream_url,
    )
    if not base_match:
        return [{"quality": determine_quality(stream_url), "url": stream_url}]
    base = base_match.group(1)
    return [
        {"quality": label, "url": f"{base}-{suffix}.mp4"}
        for suffix, label in QUALITY_LABELS.items()
    ]

def extract_movie_card(card) -> Optional[dict]:
    try:
        href = get_attr(card, "href") or ""
        if not href or "/detail/" not in href:
            return None
        full_url = BASE_URL + href if not href.startswith("http") else href
        movie_id = slugify_id(full_url)

        title_attr = get_attr(card, "title") or ""
        title = None
        if title_attr and "go to " in title_attr and " detail page" in title_attr:
            title = title_attr.replace("go to ", "").replace(" detail page", "").strip()
        if not title:
            p_els = card.css("p")
            if p_els:
                title = p_els[0].text.strip() if p_els[0].text else None
        if not title or len(title) < 2:
            return None

        all_p = card.css("p")
        year = rating = quality = None
        for p in all_p[1:]:
            text = (p.text or "").strip()
            if re.match(r"^\d{4}$", text):
                year = text
            elif re.match(r"^\d+\.?\d*$", text):
                rating = text
            elif text in ("HD", "CAM", "4K", "FHD", "SD", "TS"):
                quality = text

        content_type = "tv-show" if "-season-" in href or "/series/" in href else "movie"
        return {
            "id": movie_id,
            "title": title,
            "poster": None,
            "year": year,
            "rating": rating,
            "type": content_type,
            "quality": quality,
        }
    except Exception:
        return None

async def fetch_poster(client: httpx.AsyncClient, movie: dict, sem: asyncio.Semaphore) -> None:
    async with sem:
        movie_id = movie.get("id")
        if not movie_id or movie.get("poster"):
            return
        try:
            url = f"{BASE_URL}/{decode_movie_id(movie_id)}"
            r = await client.get(url, timeout=10)
            if r.status_code == 200:
                page = parse_page(r.text, url)
                og = css1(page, 'meta[property="og:image"]')
                if og:
                    movie["poster"] = get_attr(og, "content")
        except Exception:
            pass

# ── Playwright-based stream extraction ────────────────────────────────────────
async def _playwright_extract_streams(
    movie_id: str,
    season: Optional[int] = None,
    episode: Optional[int] = None,
) -> dict:
    """
    Use Playwright + network interception to capture the actual stream URLs
    from the MovieBox player API, even on CSR pages.
    Supports optional login via MOVIEBOX_EMAIL / MOVIEBOX_PASSWORD env vars.
    """
    from playwright.async_api import async_playwright

    target_url = f"{BASE_URL}/{decode_movie_id(movie_id)}"
    captured_play_response: dict = {}
    captured_mp4s: list[str] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        )
        ctx = await browser.new_context(
            user_agent=HEADERS["User-Agent"],
            locale="en-US",
        )
        page = await ctx.new_page()

        # Intercept /subject/play to grab stream URLs
        async def on_response(response):
            if "/subject/play" in response.url or "/media-player" in response.url:
                try:
                    data = await response.json()
                    if isinstance(data, dict):
                        captured_play_response.update(data)
                except Exception:
                    pass
            # Also catch direct MP4/m3u8 from CDN
            url = response.url
            if "macdn.aoneroom.com" in url and ".mp4" in url and url not in captured_mp4s:
                captured_mp4s.append(url)

        page.on("response", on_response)

        # Optional: login first
        email = os.environ.get("MOVIEBOX_EMAIL")
        password = os.environ.get("MOVIEBOX_PASSWORD")
        if email and password:
            try:
                await _playwright_login(page, email, password)
            except Exception as e:
                logger.warning(f"Login failed: {e}")

        try:
            await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
            # Wait for player API call
            await page.wait_for_timeout(5000)

            # Try clicking play if video element isn't loading
            try:
                play_btn = page.locator('button:has-text("Play"), .play-btn, [class*="play"]').first
                if await play_btn.count() > 0:
                    await play_btn.click()
                    await page.wait_for_timeout(3000)
            except Exception:
                pass

            # Also scrape the page DOM for Nuxt data
            html = await page.content()
            page_obj = parse_page(html, target_url)
            nuxt = parse_nuxt_data(page_obj)
            nuxt_streams = extract_streams_from_nuxt(nuxt)
            for s in nuxt_streams:
                if s not in captured_mp4s:
                    captured_mp4s.append(s)

        except Exception as e:
            logger.error(f"Playwright page error: {e}")
        finally:
            await browser.close()

    return {"play_response": captured_play_response, "mp4s": captured_mp4s}


async def _playwright_login(page, email: str, password: str) -> None:
    """Attempt to log into MovieBox via the web login form."""
    await page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded", timeout=15000)
    await page.wait_for_timeout(2000)
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', email)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"], .login-btn, button:has-text("Login"), button:has-text("Sign in")')
    await page.wait_for_timeout(3000)
    logger.info("Login attempt complete")


async def _build_sources_from_play_response(play_response: dict) -> list[dict]:
    """Parse the /subject/play API response into our source format."""
    sources = []
    streams = play_response.get("streams") or play_response.get("data", {}).get("streams", [])
    for s in streams:
        url = s.get("url") or s.get("streamUrl") or s.get("playUrl") or ""
        quality = s.get("quality") or s.get("resolution") or "Unknown"
        stype = "hls" if ".m3u8" in url else "mp4"
        if url:
            sources.append({"quality": quality, "url": url, "type": stype})

    hls = play_response.get("hls") or play_response.get("data", {}).get("hls", [])
    for h in hls:
        url = h if isinstance(h, str) else h.get("url", "")
        if url:
            sources.append({"quality": "Auto", "url": url, "type": "hls"})

    return sources


# ── Public API functions ───────────────────────────────────────────────────────

async def scrape_homepage(genre: Optional[str] = None) -> dict:
    url = BASE_URL + (f"/?genre={urllib.parse.quote(genre)}" if genre else "/")
    html = await fetch_html(url)
    page_obj = parse_page(html, url)
    cards = page_obj.css("a.movie-card")
    movies = [m for card in cards if (m := extract_movie_card(card))]
    _index_movies(movies)
    return {"movies": movies, "total": len(movies)}


async def scrape_trending() -> list:
    urls = [BASE_URL + "/trending", BASE_URL + "/popular", BASE_URL + "/"]
    for url in urls:
        try:
            html = await fetch_html(url)
            page_obj = parse_page(html, url)
            cards = page_obj.css("a.movie-card")
            movies = [m for card in cards if (m := extract_movie_card(card))]
            if movies:
                _index_movies(movies)
                return movies
        except Exception as e:
            logger.warning(f"Trending URL {url} failed: {e}")
    return []


async def scrape_genres() -> dict:
    try:
        html = await fetch_html(BASE_URL + "/")
        page_obj = parse_page(html, BASE_URL)
        genre_links = page_obj.css('a[href*="/genre/"], a[href*="?genre="]')
        genres = []
        seen = set()
        for link in genre_links:
            href = get_attr(link, "href") or ""
            name = (link.text or "").strip()
            if name and name not in seen:
                seen.add(name)
                genres.append({"name": name, "slug": href})
        return {"genres": genres}
    except Exception as e:
        logger.error(f"Genres error: {e}")
        return {"genres": []}


async def scrape_movies(
    page: int = 1,
    limit: int = 20,
    genre: Optional[str] = None,
    content_type: Optional[str] = None,
) -> dict:
    url = BASE_URL + "/"
    if genre:
        url += f"?genre={urllib.parse.quote(genre)}"
    html = await fetch_html(url)
    page_obj = parse_page(html, url)
    cards = page_obj.css("a.movie-card")
    movies = [m for card in cards if (m := extract_movie_card(card))]
    if content_type in ("movie", "tv-show"):
        movies = [m for m in movies if m.get("type") == content_type]
    _index_movies(movies)
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


async def scrape_search(
    query: str,
    page: int = 1,
    limit: int = 20,
) -> dict:
    encoded = urllib.parse.quote(query)
    search_urls = [
        f"{BASE_URL}/search/{encoded}",
        f"{BASE_URL}/search?q={encoded}",
    ]
    for url in search_urls:
        try:
            html = await fetch_html(url)
            page_obj = parse_page(html, url)
            cards = page_obj.css("a.movie-card")
            movies = [m for card in cards if (m := extract_movie_card(card))]
            if movies:
                _index_movies(movies)
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
        except Exception as e:
            logger.warning(f"Search URL {url} failed: {e}")

    # Fallback: in-memory fuzzy index
    index_result = _index_search(query, page, limit)
    if index_result["total"] > 0:
        return index_result

    try:
        html = await fetch_html(BASE_URL + "/")
        page_obj = parse_page(html, BASE_URL + "/")
        cards = page_obj.css("a.movie-card")
        fresh = [m for card in cards if (m := extract_movie_card(card))]
        _index_movies(fresh)
        return _index_search(query, page, limit)
    except Exception as e:
        logger.error(f"Search fallback error: {e}")
        return {"results": [], "page": page, "limit": limit, "total": 0, "hasNextPage": False}


async def scrape_movie_detail(movie_id: str) -> Optional[dict]:
    decoded_path = decode_movie_id(movie_id)
    url = f"{BASE_URL}/{decoded_path}"
    logger.info(f"Scraping detail: {url}")
    try:
        html = await fetch_html(url)
        page_obj = parse_page(html, url)
        ld = parse_json_ld(page_obj)
        nuxt = parse_nuxt_data(page_obj)

        title = None
        og_title = css1(page_obj, 'meta[property="og:title"]')
        if og_title:
            raw = get_attr(og_title, "content") or ""
            cleaned = re.sub(r"^Watch\s+", "", raw)
            cleaned = re.sub(r"\s+Streaming Online.*$", "", cleaned, flags=re.IGNORECASE)
            title = cleaned.strip() or None
        if not title:
            title = ld.get("name") or get_text(page_obj, "h1") or "Unknown"

        poster = None
        og_image = css1(page_obj, 'meta[property="og:image"]')
        if og_image:
            poster = get_attr(og_image, "content")

        description = None
        og_desc = css1(page_obj, 'meta[property="og:description"]')
        if og_desc:
            description = get_attr(og_desc, "content")
        if not description:
            description = ld.get("description")

        year = None
        date_match = re.search(r"\b(19|20)\d{2}\b", " ".join(str(x) for x in nuxt if isinstance(x, str)))
        if date_match:
            year = date_match.group(0)

        content_type = "tv-show" if any(
            isinstance(x, str) and ("season" in x.lower() or "episode" in x.lower()) for x in nuxt
        ) else "movie"

        sources_data = await scrape_sources(movie_id)

        return {
            "id": movie_id,
            "title": title,
            "poster": poster,
            "backdrop": poster,
            "description": description,
            "year": year,
            "type": content_type,
            "sources": sources_data.get("sources", []),
            "audioTracks": sources_data.get("audioTracks", []),
        }
    except Exception as e:
        logger.error(f"Detail error for {movie_id}: {e}", exc_info=True)
        return None


async def scrape_episodes(movie_id: str, season: int = 1) -> dict:
    decoded_path = decode_movie_id(movie_id)
    url = f"{BASE_URL}/{decoded_path}"
    try:
        html = await fetch_html(url)
        page_obj = parse_page(html, url)
        nuxt = parse_nuxt_data(page_obj)

        episodes = []
        seen_ids: set[str] = set()

        ep_containers = page_obj.css('[class*="episode"], [class*="Episode"]')
        for ep in ep_containers:
            links = ep.css("a")
            for link in links:
                href = get_attr(link, "href") or ""
                if "/detail/" not in href:
                    continue
                full_url = href if href.startswith("http") else BASE_URL + href
                ep_id = slugify_id(full_url)
                if not ep_id or ep_id in seen_ids:
                    continue
                seen_ids.add(ep_id)
                ep_title = (link.text or "").strip() or f"Episode {len(episodes) + 1}"
                episodes.append({
                    "id": ep_id,
                    "title": ep_title,
                    "episode": len(episodes) + 1,
                    "season": season,
                    "thumbnail": None,
                    "description": None,
                })

        return {"episodes": episodes, "season": season, "totalSeasons": 1}
    except Exception as e:
        logger.error(f"Episodes error for {movie_id}: {e}", exc_info=True)
        return {"episodes": [], "season": season, "totalSeasons": 1}


async def scrape_sources(
    movie_id: str,
    season: Optional[int] = None,
    episode: Optional[int] = None,
) -> dict:
    """
    Extract streaming sources for a movie or TV episode.
    Strategy:
    1. Try static Nuxt SSR parse first (fast, no JS needed)
    2. If empty, use Playwright to render the page and intercept the play API
    3. Build quality variants from CDN URL pattern
    """
    target_id = movie_id

    if season is not None and episode is not None:
        try:
            episodes_data = await scrape_episodes(movie_id, season)
            eps = episodes_data.get("episodes", [])
            ep = next((e for e in eps if e["episode"] == episode), None)
            if ep and ep.get("id"):
                target_id = ep["id"]
        except Exception as ex:
            logger.warning(f"Could not resolve episode ID: {ex}")

    decoded_path = decode_movie_id(target_id)
    url = f"{BASE_URL}/{decoded_path}"
    logger.info(f"Scraping sources (static): {url}")

    all_sources: list[dict] = []
    audio_tracks: list[dict] = []

    # ── Step 1: static parse ───────────────────────────────────────────────
    try:
        html = await fetch_html(url)
        page_obj = parse_page(html, url)
        nuxt = parse_nuxt_data(page_obj)
        raw_streams = extract_streams_from_nuxt(nuxt)

        for v in page_obj.css("video"):
            src = get_attr(v, "src")
            if src and "macdn.aoneroom.com" in src and ".mp4" in src and src not in raw_streams:
                raw_streams.append(src)

        seen_bases: set[str] = set()
        for stream in raw_streams:
            variants = build_quality_variants(stream)
            base = variants[0]["url"].rsplit("-", 1)[0] if variants else stream
            if base not in seen_bases:
                seen_bases.add(base)
                for v in variants:
                    all_sources.append({"quality": v["quality"], "url": v["url"], "type": "mp4"})

        # Extract audio language tracks from Nuxt
        lang_slugs: list[str] = []
        i = 0
        LANG_NAMES = {
            "Hindi", "English", "Tamil", "Telugu", "Arabic", "Original Audio",
            "Hindi dub", "English dub", "Arabic sub", "Indonesian sub",
            "Tamil dub", "Telugu dub",
        }
        while i < len(nuxt):
            item = nuxt[i]
            if isinstance(item, str) and item in LANG_NAMES:
                for j in range(max(0, i - 3), min(len(nuxt), i + 3)):
                    if 0 <= j < len(nuxt) and isinstance(nuxt[j], str) and re.match(r"^[\w-]+-[A-Za-z0-9]+$", nuxt[j]):
                        slug = nuxt[j]
                        if slug not in lang_slugs:
                            lang_slugs.append(slug)
                            audio_tracks.append({"language": item, "slug": slug})
                        break
            i += 1
    except Exception as e:
        logger.warning(f"Static parse failed for {target_id}: {e}")

    # ── Step 2: Playwright fallback if no sources found ────────────────────
    if not all_sources:
        logger.info(f"Static found nothing — trying Playwright for {target_id}")
        try:
            pw_result = await _playwright_extract_streams(target_id, season, episode)

            play_resp = pw_result.get("play_response", {})
            pw_mp4s = pw_result.get("mp4s", [])

            # Build from /subject/play response
            api_sources = await _build_sources_from_play_response(play_resp)
            all_sources.extend(api_sources)

            # Build from intercepted MP4 URLs
            seen_bases_pw: set[str] = set()
            for stream in pw_mp4s:
                variants = build_quality_variants(stream)
                base = variants[0]["url"].rsplit("-", 1)[0] if variants else stream
                if base not in seen_bases_pw:
                    seen_bases_pw.add(base)
                    for v in variants:
                        entry = {"quality": v["quality"], "url": v["url"], "type": "mp4"}
                        if entry not in all_sources:
                            all_sources.append(entry)

        except Exception as e:
            logger.error(f"Playwright extraction failed: {e}", exc_info=True)

    logger.info(f"Sources for {target_id}: {len(all_sources)} found")
    return {
        "id": movie_id,
        "sources": all_sources,
        "audioTracks": audio_tracks,
        "season": season,
        "episode": episode,
    }


async def scrape_subtitles(movie_id: str) -> dict:
    decoded_path = decode_movie_id(movie_id)
    url = f"{BASE_URL}/{decoded_path}"
    try:
        html = await fetch_html(url)
        page_obj = parse_page(html, url)
        nuxt = parse_nuxt_data(page_obj)
        subtitles = []
        LANG_NAMES = {"Hindi", "English", "Tamil", "Telugu", "Arabic", "Indonesian"}
        for item in nuxt:
            if isinstance(item, str) and item in LANG_NAMES:
                subtitles.append({"language": item})
        return {"id": movie_id, "subtitles": subtitles}
    except Exception as e:
        logger.error(f"Subtitles error: {e}")
        return {"id": movie_id, "subtitles": []}
