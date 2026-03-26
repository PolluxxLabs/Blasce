import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contentRouter from "./content";
import genresRouter from "./genres";
import watchlistRouter from "./watchlist";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/content", contentRouter);
router.use("/genres", genresRouter);
router.use("/watchlist", watchlistRouter);

export default router;
