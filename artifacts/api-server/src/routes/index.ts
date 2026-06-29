import { Router, type IRouter } from "express";
import healthRouter from "./health.ts";
import brandsRouter from "./brands.ts";
import availabilityRouter from "./availability.ts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(brandsRouter);
router.use(availabilityRouter);

export default router;
