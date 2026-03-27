import asyncio
import time
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging
from scrapler import (
    scrape_movies,
    scrape_search,
    scrape_movie_detail,
    scrape_episodes,
    scrape_sources,
    scrape_homepage,
    scrape_trending,
    scrape_genres,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Blasce Scraper", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache: dict = {}
CACHE_TTL = 5 * 60
SOURCES_CACHE_TTL = 30 * 60

def get_cached(key: str, ttl: int = CACHE_TTL):
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < ttl:
        return entry["data"]
    return None

def set_cached(key: str, data):
    _cache[key] = {"ts": time.time(), "data": data}


@app.get("/health")
async def health():
    return {"status": "ok", "version": "3.0.0"}


@app.get("/genres")
async def get_genres():
    cached = get_cached("genres")
    if cached:
        return cached
    try:
        result = await scrape_genres()
        set_cached("genres", result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/homepage")
async def get_homepage(
    genre: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    cache_key = f"homepage:{genre or ''}"
    cached = get_cached(cache_key)
    if not cached:
        try:
            result = await scrape_homepage(genre=genre)
            set_cached(cache_key, result)
            cached = result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    movies = cached.get("movies", [])
    if type in ("movie", "tv-show"):
        movies = [m for m in movies if m.get("type") == type]
    total = len(movies)
    start = (page - 1) * limit
    end = start + limit
    return {**cached, "movies": movies[start:end], "page": page, "limit": limit, "total": total, "hasNextPage": end < total}


@app.get("/trending")
async def get_trending(
    type: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    cached = get_cached("trending")
    if not cached:
        try:
            result = await scrape_trending()
            set_cached("trending", result)
            cached = result
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    items = cached if isinstance(cached, list) else cached.get("results", [])
    if type in ("movie", "tv-show"):
        items = [m for m in items if m.get("type") == type]
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    return {"results": items[start:end], "page": page, "limit": limit, "total": total, "hasNextPage": end < total}


@app.get("/movies")
async def get_movies(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    genre: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
):
    cache_key = f"movies:{genre or ''}:{type or ''}:{page}"
    cached = get_cached(cache_key)
    if cached:
        return cached
    try:
        result = await scrape_movies(page=page, limit=limit, genre=genre, content_type=type)
        set_cached(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search")
async def search_movies(
    q: str = Query(..., min_length=1),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    cache_key = f"search:{q}:{page}"
    cached = get_cached(cache_key, ttl=60)
    if cached:
        return cached
    try:
        result = await scrape_search(query=q, page=page, limit=limit)
        set_cached(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/movie/{movie_id}")
async def get_movie(movie_id: str):
    cache_key = f"movie:{movie_id}"
    cached = get_cached(cache_key, ttl=3600)
    if cached:
        return cached
    try:
        result = await scrape_movie_detail(movie_id)
        if not result:
            raise HTTPException(status_code=404, detail="Movie not found")
        set_cached(cache_key, result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sources/{movie_id}")
async def get_sources(
    movie_id: str,
    season: Optional[int] = Query(default=None, ge=1),
    episode: Optional[int] = Query(default=None, ge=1),
):
    cache_key = f"sources:{movie_id}:{season}:{episode}"
    cached = get_cached(cache_key, ttl=SOURCES_CACHE_TTL)
    if cached:
        return cached
    try:
        result = await scrape_sources(movie_id=movie_id, season=season, episode=episode)
        if result.get("sources"):
            set_cached(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"Error scraping sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/episodes/{movie_id}")
async def get_episodes(
    movie_id: str,
    season: int = Query(default=1, ge=1),
):
    cache_key = f"episodes:{movie_id}:{season}"
    cached = get_cached(cache_key)
    if cached:
        return cached
    try:
        result = await scrape_episodes(movie_id=movie_id, season=season)
        set_cached(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{movie_id}")
async def get_download(
    movie_id: str,
    season: Optional[int] = Query(default=None, ge=1),
    episode: Optional[int] = Query(default=None, ge=1),
    quality: Optional[str] = Query(default=None),
):
    cache_key = f"download:{movie_id}:{season}:{episode}:{quality}"
    cached = get_cached(cache_key, ttl=SOURCES_CACHE_TTL)
    if cached:
        return cached
    try:
        sources_data = await scrape_sources(movie_id=movie_id, season=season, episode=episode)
        sources = sources_data.get("sources", [])
        if not sources:
            raise HTTPException(status_code=404, detail="No download sources found")

        QUALITY_ORDER = ["1080p", "720p", "480p", "360p"]
        if quality:
            match = next((s for s in sources if s.get("quality") == quality), None) or sources[0]
        else:
            match = None
            for q in QUALITY_ORDER:
                match = next((s for s in sources if s.get("quality") == q), None)
                if match:
                    break
            match = match or sources[0]

        result = {
            "id": movie_id,
            "quality": match.get("quality"),
            "url": match.get("url"),
            "type": match.get("type", "mp4"),
            "season": season,
            "episode": episode,
            "allSources": sources,
        }
        set_cached(cache_key, result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


