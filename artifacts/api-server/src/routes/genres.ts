import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { genresTable } from "@workspace/db/schema";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const genres = await db
    .select()
    .from(genresTable)
    .orderBy(asc(genresTable.name));

  res.json({ genres });
});

export default router;
