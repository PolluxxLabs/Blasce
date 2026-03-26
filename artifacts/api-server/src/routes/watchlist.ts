import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  watchlistTable,
  contentTable,
  genresTable,
  contentGenresTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

async function getGenresForContent(contentId: number): Promise<string[]> {
  const rows = await db
    .select({ name: genresTable.name })
    .from(contentGenresTable)
    .innerJoin(genresTable, eq(contentGenresTable.genreId, genresTable.id))
    .where(eq(contentGenresTable.contentId, contentId));
  return rows.map((r) => r.name);
}

router.get("/", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const items = await db
    .select({ content: contentTable })
    .from(watchlistTable)
    .innerJoin(contentTable, eq(watchlistTable.contentId, contentTable.id))
    .where(eq(watchlistTable.sessionId, sessionId))
    .orderBy(watchlistTable.addedAt);

  const enriched = await Promise.all(
    items.map(async ({ content }) => {
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
    })
  );

  res.json({ items: enriched, total: enriched.length });
});

router.post("/", async (req, res) => {
  const { contentId, sessionId } = req.body;

  if (!contentId || !sessionId) {
    res.status(400).json({ error: "contentId and sessionId are required" });
    return;
  }

  const existing = await db
    .select()
    .from(watchlistTable)
    .where(
      and(
        eq(watchlistTable.contentId, Number(contentId)),
        eq(watchlistTable.sessionId, sessionId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.json(existing[0]);
    return;
  }

  const [item] = await db
    .insert(watchlistTable)
    .values({ contentId: Number(contentId), sessionId })
    .returning();

  res.json(item);
});

router.delete("/:contentId", async (req, res) => {
  const contentId = Number(req.params.contentId);
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  await db
    .delete(watchlistTable)
    .where(
      and(
        eq(watchlistTable.contentId, contentId),
        eq(watchlistTable.sessionId, sessionId)
      )
    );

  res.json({ success: true });
});

export default router;
