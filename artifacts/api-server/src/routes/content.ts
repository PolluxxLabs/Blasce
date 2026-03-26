import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contentTable,
  genresTable,
  contentGenresTable,
  castTable,
  episodesTable,
} from "@workspace/db/schema";
import { eq, ilike, and, inArray, sql, desc, asc } from "drizzle-orm";

const router: IRouter = Router();

async function getGenresForContent(contentId: number): Promise<string[]> {
  const rows = await db
    .select({ name: genresTable.name })
    .from(contentGenresTable)
    .innerJoin(genresTable, eq(contentGenresTable.genreId, genresTable.id))
    .where(eq(contentGenresTable.contentId, contentId));
  return rows.map((r) => r.name);
}

async function enrichContent(content: typeof contentTable.$inferSelect) {
  const genres = await getGenresForContent(content.id);
  return {
    id: content.id,
    title: content.title,
    type: content.type,
    description: content.description,
    posterUrl: content.posterUrl,
    backdropUrl: content.backdropUrl,
    trailerUrl: content.trailerUrl,
    releaseYear: content.releaseYear,
    rating: content.rating,
    imdbScore: content.imdbScore,
    duration: content.duration,
    featured: content.featured,
    trending: content.trending,
    trendingRank: content.trendingRank,
    seasons: content.seasons,
    totalEpisodes: content.totalEpisodes,
    genres,
  };
}

router.get("/featured/hero", async (req, res) => {
  const [item] = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.featured, true))
    .orderBy(sql`random()`)
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "No featured content found" });
    return;
  }

  const genres = await getGenresForContent(item.id);
  const cast = await db
    .select()
    .from(castTable)
    .where(eq(castTable.contentId, item.id))
    .orderBy(asc(castTable.sortOrder));

  res.json({ ...item, genres, cast, episodes: [] });
});

router.get("/trending/now", async (req, res) => {
  const limit = Number(req.query.limit) || 10;

  const items = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.trending, true))
    .orderBy(asc(contentTable.trendingRank))
    .limit(limit);

  const enriched = await Promise.all(items.map(enrichContent));
  res.json({ items: enriched, total: enriched.length });
});

router.get("/", async (req, res) => {
  const { type, genre, search, featured } = req.query;
  const limit = Number(req.query.limit) || 20;
  const offset = Number(req.query.offset) || 0;

  const conditions = [];

  if (type === "movie" || type === "tv") {
    conditions.push(eq(contentTable.type, type));
  }

  if (search && typeof search === "string") {
    conditions.push(ilike(contentTable.title, `%${search}%`));
  }

  if (featured === "true") {
    conditions.push(eq(contentTable.featured, true));
  }

  let contentIds: number[] | null = null;
  if (genre && typeof genre === "string") {
    const [genreRow] = await db
      .select()
      .from(genresTable)
      .where(eq(genresTable.slug, genre))
      .limit(1);

    if (genreRow) {
      const cg = await db
        .select({ contentId: contentGenresTable.contentId })
        .from(contentGenresTable)
        .where(eq(contentGenresTable.genreId, genreRow.id));
      contentIds = cg.map((r) => r.contentId);
      if (contentIds.length === 0) {
        res.json({ items: [], total: 0 });
        return;
      }
    }
  }

  if (contentIds !== null) {
    conditions.push(inArray(contentTable.id, contentIds));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contentTable)
    .where(whereClause);

  const total = Number(countResult?.count ?? 0);

  const items = await db
    .select()
    .from(contentTable)
    .where(whereClause)
    .orderBy(desc(contentTable.trending), desc(contentTable.featured), desc(contentTable.releaseYear))
    .limit(limit)
    .offset(offset);

  const enriched = await Promise.all(items.map(enrichContent));
  res.json({ items: enriched, total });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [item] = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.id, id))
    .limit(1);

  if (!item) {
    res.status(404).json({ error: "Content not found" });
    return;
  }

  const [genres, cast, episodes] = await Promise.all([
    getGenresForContent(id),
    db
      .select()
      .from(castTable)
      .where(eq(castTable.contentId, id))
      .orderBy(asc(castTable.sortOrder)),
    db
      .select()
      .from(episodesTable)
      .where(eq(episodesTable.contentId, id))
      .orderBy(asc(episodesTable.season), asc(episodesTable.episode)),
  ]);

  res.json({
    id: item.id,
    title: item.title,
    type: item.type,
    description: item.description,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    trailerUrl: item.trailerUrl,
    releaseYear: item.releaseYear,
    rating: item.rating,
    imdbScore: item.imdbScore,
    duration: item.duration,
    featured: item.featured,
    trending: item.trending,
    trendingRank: item.trendingRank,
    seasons: item.seasons,
    totalEpisodes: item.totalEpisodes,
    genres,
    cast: cast.map((c) => ({
      name: c.name,
      character: c.character,
      photoUrl: c.photoUrl,
    })),
    episodes: episodes.map((e) => ({
      id: e.id,
      season: e.season,
      episode: e.episode,
      title: e.title,
      description: e.description,
      duration: e.duration,
      thumbnailUrl: e.thumbnailUrl,
    })),
  });
});

export default router;
